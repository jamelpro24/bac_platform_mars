from django.db.models.manager import BaseManager
from rest_framework import viewsets, permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from django.http import HttpResponse, FileResponse
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .generate_views import generate_documents, download_document
import pandas as pd

from .models import MatiereSection, Section, Session, Salle, Matiere, Serie, Examen, Inscription, Candidat, TemplateMatiere, TemplateExamen, ExamenSalle
from .serializers import (
    MatiereSectionSerializer, SessionSerializer, SalleSerializer, MatiereSerializer,
    SerieSerializer, ExamenSerializer, InscriptionSerializer, ExamenSalleSerializer
)
import uuid
import io
from docx import Document

# ==================== INSCRIPTIONS PAR NOM ====================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inscriptions_by_serie(request):
    serie_nom = request.GET.get('serie')
    if not serie_nom:
        return Response({"error": "Nom de série requis"}, status=400)
    data = Inscription.objects.filter(
        serie__nom=serie_nom,
        serie__user=request.user,
    ).order_by('num_ins').values('id', 'num_ins', 'nom_prenom', 'cin', 'section', 'etablissement')
    return Response(list(data))

# ==================== BASE VIEWSET ====================
class BaseDirectorViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

# ==================== VIEWSETS ====================
class SessionViewSet(BaseDirectorViewSet):
    queryset = Session.objects.all()
    serializer_class = SessionSerializer

class SalleViewSet(BaseDirectorViewSet):
    queryset = Salle.objects.all()
    serializer_class = SalleSerializer
    def get_queryset(self):
        qs = super().get_queryset()
        max_salles = self.request.user.nombre_salles
        if max_salles > 0:
            qs = qs.filter(numero__lte=max_salles)
        return qs
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class MatiereViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Matiere.objects.all()
    serializer_class = MatiereSerializer
    def get_queryset(self):
        return Matiere.objects.all()
    def perform_create(self, serializer):
        serializer.save()

class SerieViewSet(BaseDirectorViewSet):
    queryset = Serie.objects.all().select_related('section')
    serializer_class = SerieSerializer

class ExamenViewSet(BaseDirectorViewSet):
    queryset = Examen.objects.all()
    serializer_class = ExamenSerializer
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class ExamenSalleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ExamenSalleSerializer
    queryset = ExamenSalle.objects.all()

    def get_queryset(self):
        qs = ExamenSalle.objects.select_related('examen', 'salle', 'serie', 'surveillant_1', 'surveillant_2')
        examen_id = self.request.query_params.get('examen')
        if examen_id:
            qs = qs.filter(examen_id=examen_id)
        return qs

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=False, methods=['delete'], url_path='clear')
    def clear_for_examen(self, request):
        examen_id = request.query_params.get('examen')
        if not examen_id:
            return Response({"error": "examen id requis"}, status=400)
        deleted, _ = ExamenSalle.objects.filter(examen_id=examen_id).delete()
        return Response({"deleted": deleted})

class InscriptionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class   = InscriptionSerializer
    queryset           = Inscription.objects.all()

    def get_queryset(self):
        queryset = Inscription.objects.filter(
            serie__user=self.request.user
        ).select_related('serie').order_by('num_ins')
        serie_nom = self.request.query_params.get('serie')
        if serie_nom:
            queryset = queryset.filter(serie__nom=serie_nom)
        return queryset

# ==================== BULK INSCRIPTIONS ====================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_inscriptions(request):
    data              = request.data
    serie_name        = data.get('serie')
    inscriptions_list = data.get('inscriptions', [])

    if not serie_name:
        return Response({"error": "Le nom de la série est obligatoire."}, status=400)
    if not isinstance(inscriptions_list, list):
        return Response({"error": "Le champ 'inscriptions' doit être une liste."}, status=400)
    if len(inscriptions_list) > 18:
        return Response({"error": "لا يمكن تجاوز 18 مترشح."}, status=400)

    try:
        serie = Serie.objects.get(nom=serie_name, user=request.user)
    except Serie.DoesNotExist:
        return Response({"error": f"السلسلة '{serie_name}' غير موجودة"}, status=404)
    except Serie.MultipleObjectsReturned:
        serie = Serie.objects.filter(nom=serie_name, user=request.user).first()

    Inscription.objects.filter(serie=serie).delete()

    processed = []
    seen = set()
    for item in inscriptions_list:
        if isinstance(item, dict):
            num_ins    = str(item.get('num_ins',    '') or '').strip()
            nom_prenom = str(item.get('nom_prenom', '') or '').strip()
            cin        = str(item.get('cin',        '') or '').strip()
            section    = str(item.get('section',    '') or '').strip()
        else:
            num_ins    = str(item).strip()
            nom_prenom = cin = section = ''

        if num_ins and num_ins not in seen:
            cand = Candidat.objects.filter(user=request.user, num_ins=num_ins).first()
            Inscription.objects.create(
                serie=serie, num_ins=num_ins,
                nom_prenom=nom_prenom, cin=cin, section=section,
                etablissement=cand.etablissement if cand else '',
            )
            processed.append(num_ins)
            seen.add(num_ins)

    return Response({"serie": serie.nom, "inscriptions": processed}, status=200)

# ==================== IMPORT FICHIER 1 — القائمة الاسمية ====================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def import_candidats(request):
    file = request.FILES.get('file')
    if not file:
        return Response({"error": "لم يتم رفع أي ملف"}, status=400)
    try:
        xl = pd.read_excel(file, sheet_name=None, dtype=str)
        count_created = count_updated = 0
        series_data = {}  # serie_name -> list of inscriptions

        for sheet_name, df in xl.items():
            df.columns = [str(c).strip() for c in df.columns]
            col_map = {}
            for col in df.columns:
                c = ' '.join(col.split())   # normalise les espaces
                if 'رقم المترشح' in c:
                    col_map[col] = 'num_ins'
                elif 'الإسم' in c or 'الاسم' in c:
                    col_map[col] = 'nom_prenom'
                elif 'بطاقة' in c or 'التعريف' in c:
                    col_map[col] = 'ncin'
                elif 'الشعبة' in c:
                    col_map[col] = 'section'
                elif 'معهد' in c or 'مؤسسة' in c or 'المؤسسة' in c:
                    col_map[col] = 'etablissement'
                elif 'سلسلة' in c or 'serie' in c.lower():
                    col_map[col] = 'serie'
            df = df.rename(columns=col_map)

            if 'num_ins' not in df.columns or 'nom_prenom' not in df.columns:
                continue

            GENERIC_SHEET_NAMES = {'feuil1', 'feuille1', 'sheet1', 'sheet', 'feuil', 'فصل1', 'ورقة1'}
            sheet_as_etab = sheet_name if sheet_name.strip().lower() not in GENERIC_SHEET_NAMES else ''

            for _, row in df.iterrows():
                num_ins    = str(row.get('num_ins')       or '').strip()
                nom_prenom = str(row.get('nom_prenom')    or '').strip()
                ncin       = str(row.get('ncin')          or '').strip()
                section    = ' '.join(str(row.get('section') or '').strip().split())
                serie_name = str(row.get('serie')         or '').strip()
                etab_col   = str(row.get('etablissement') or '').strip()
                etab_col   = '' if etab_col == 'nan' else etab_col
                etablissement = etab_col or sheet_as_etab

                if not num_ins or num_ins == 'nan':
                    continue

                _, created = Candidat.objects.update_or_create(
                    user=request.user, num_ins=num_ins,
                    defaults={
                        'nom_prenom':    nom_prenom,
                        'ncin':          ncin,
                        'section':       section,
                        'etablissement': etablissement,
                    }
                )
                if created: count_created += 1
                else:        count_updated += 1

                # Collect series data for later processing
                if serie_name and serie_name != 'nan':
                    if serie_name not in series_data:
                        series_data[serie_name] = []
                    series_data[serie_name].append({
                        "num_ins": num_ins,
                        "nom_prenom": nom_prenom,
                        "cin": ncin,
                        "section": section,
                        "etablissement": etablissement,
                    })

        # Auto-create series and inscriptions if serie column was present
        series_created = []
        series_errors = []
        if series_data:
            for serie_name, inscriptions in series_data.items():
                if len(inscriptions) > 18:
                    series_errors.append(f"سلسلة '{serie_name}' تحتوي على {len(inscriptions)} مترشح (الحد الأقصى 18)")
                    continue

                sections_set = {ins["section"] for ins in inscriptions if ins["section"]}
                if len(sections_set) > 1:
                    series_errors.append(f"سلسلة '{serie_name}' تحتوي على مترشحين من شعب مختلفة: {', '.join(sections_set)}")
                    continue

                section_name = sections_set.pop() if sections_set else ""
                section_obj = None
                if section_name:
                    section_obj, _ = Section.objects.get_or_create(nom=section_name, user=request.user)

                serie_obj, _ = Serie.objects.get_or_create(
                    nom=serie_name, user=request.user,
                    defaults={"section": section_obj}
                )
                if section_obj:
                    serie_obj.section = section_obj
                    serie_obj.save(update_fields=['section'])

                Inscription.objects.filter(serie=serie_obj).delete()
                for ins in inscriptions:
                    Inscription.objects.create(
                        serie=serie_obj,
                        num_ins=ins["num_ins"],
                        nom_prenom=ins["nom_prenom"],
                        cin=ins["cin"],
                        section=ins["section"],
                        etablissement=ins["etablissement"],
                    )

                insc_data = list(
                    Inscription.objects.filter(serie=serie_obj)
                    .order_by('num_ins')
                    .values('id', 'num_ins', 'nom_prenom', 'cin', 'section', 'etablissement')
                )
                series_created.append({
                    "id": serie_obj.id,
                    "serie": serie_obj.nom,
                    "section": section_name,
                    "section_id": section_obj.id if section_obj else None,
                    "inscriptions": insc_data,
                })

        response = {
            "message": f"تم استيراد {count_created + count_updated} مترشح ({count_created} جديد، {count_updated} محدّث)",
            "created": count_created, "updated": count_updated,
            "total": count_created + count_updated,
        }
        if series_created:
            response["series"] = series_created
            response["series_message"] = f"تم إنشاء {len(series_created)} سلسلة"
        if series_errors:
            response["series_errors"] = series_errors
        return Response(response, status=200)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

# ==================== CANDIDATS COUNT ====================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def candidats_count(request):
    return Response({"count": Candidat.objects.filter(user=request.user).count()})

# ==================== IMPORT FICHIER 2 — السلاسل ====================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def import_excel(request):
    file = request.FILES.get('file')
    if not file:
        return Response({"error": "لم يتم رفع أي ملف."}, status=400)

    try:
        xl = pd.read_excel(file, sheet_name=None, dtype=str)

        if 'liste' not in xl:
            return Response({"error": "La feuille 'liste' est obligatoire."}, status=400)

        df = xl['liste']
        df.columns = [str(c).strip().lower() for c in df.columns]

        if 'serie' not in df.columns or 'num_ins' not in df.columns:
            return Response({"error": "الأعمدة المطلوبة: serie , num_ins"}, status=400)

        skipped_numbers = []
        series_map = {}

        for _, row in df.iterrows():
            serie_name = str(row.get('serie', '')).strip()
            num_ins    = str(row.get('num_ins', '')).strip()
            if not serie_name or not num_ins:
                continue

            candidat = Candidat.objects.filter(user=request.user, num_ins=num_ins).first()
            if not candidat:
                skipped_numbers.append(num_ins)
                continue

            if serie_name not in series_map:
                series_map[serie_name] = []

            series_map[serie_name].append({
                "num_ins":       num_ins,
                "nom_prenom":    candidat.nom_prenom,
                "cin":           candidat.ncin,
                "section":       candidat.section       or '',
                "etablissement": candidat.etablissement or '',  # ✅ معهد المترشح
            })

        errors = []
        created_series = []

        for serie_name, inscriptions in series_map.items():
            if len(inscriptions) > 18:
                errors.append(f"سلسلة '{serie_name}' تحتوي على {len(inscriptions)} مترشح (الحد الأقصى 18)")
                continue

            sections = {ins["section"] for ins in inscriptions if ins["section"]}
            if len(sections) > 1:
                errors.append(f"سلسلة '{serie_name}' تحتوي على مترشحين من شعب مختلفة: {', '.join(sections)}")
                continue

            section_name = sections.pop() if sections else ""
            section_obj  = None
            if section_name:
                section_obj, _ = Section.objects.get_or_create(nom=section_name, user=request.user)

            serie_obj, _ = Serie.objects.get_or_create(
                nom=serie_name, user=request.user,
                defaults={"section": section_obj}
            )
            if section_obj:
                serie_obj.section = section_obj
                serie_obj.save(update_fields=['section'])

            Inscription.objects.filter(serie=serie_obj).delete()

            for ins in inscriptions:
                Inscription.objects.create(
                    serie=serie_obj,
                    num_ins=ins["num_ins"],
                    nom_prenom=ins["nom_prenom"],
                    cin=ins["cin"],
                    section=ins["section"],
                    etablissement=ins["etablissement"],  # ✅
                )

            insc_data = list(
                Inscription.objects.filter(serie=serie_obj)
                .order_by('num_ins')
                .values('id', 'num_ins', 'nom_prenom', 'cin', 'section', 'etablissement')
            )
            created_series.append({
                "id":           serie_obj.id,
                "serie":        serie_obj.nom,
                "section":      section_name,
                "section_id":   section_obj.id if section_obj else None,
                "inscriptions": insc_data,
            })

        response_data = {
            "skipped":         len(skipped_numbers),
            "skipped_numbers": skipped_numbers[:20],
            "series":          created_series,
            "errors":          errors,
        }

        if errors:
            return Response(response_data, status=status.HTTP_207_MULTI_STATUS)
        return Response(response_data, status=200)

    except Exception as e:
        return Response({"error": str(e)}, status=500)

# ==================== GENERAL INFO ====================
@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def general_info(request):
    user = request.user
    if request.method == 'GET':
        sections = list(Section.objects.filter(user=user).values('id', 'nom'))
        actual_candidats = Candidat.objects.filter(user=user).count()
        sections_avec_candidats = (
            Candidat.objects.filter(user=user)
            .exclude(section='')
            .values_list('section', flat=True)
            .distinct()
            .count()
        )
        return Response({
            'centre':                   user.centre,
            'annee_scolaire':           user.annee_scolaire,
            'delegation':               user.delegation,
            'nombre_candidats':         actual_candidats,
            'nombre_salles':            user.nombre_salles,
            'nom_admin':                user.nom_admin,
            'sections':                 sections,
            'sections_avec_candidats':  sections_avec_candidats,
        })
    elif request.method == 'PUT':
        for field in ['annee_scolaire', 'delegation', 'nombre_candidats', 'nombre_salles', 'nom_admin']:
            if field in request.data:
                setattr(user, field, request.data[field])
        user.save()

        # Auto-create Salle records when nombre_salles changes
        new_count = user.nombre_salles
        existing = Salle.objects.filter(user=user).order_by('numero')
        existing_count = existing.count()
        if new_count > existing_count:
            for i in range(existing_count + 1, new_count + 1):
                Salle.objects.get_or_create(numero=i, user=user)
        elif new_count < existing_count:
            extra = existing[new_count:]
            for s in extra:
                s.delete()
        sections = list(Section.objects.filter(user=user).values('id', 'nom'))
        return Response({
            'centre':           user.centre,
            'annee_scolaire':   user.annee_scolaire,
            'delegation':       user.delegation,
            'nombre_candidats': user.nombre_candidats,
            'nombre_salles':    user.nombre_salles,
            'nom_admin':        user.nom_admin,
            'sections':         sections,
        })

# ==================== SECTION ====================
def _section_key(name: str) -> str:
    """Normalize section name: remove ال and و prefixes, then sort words"""
    import re
    words = re.sub(r'\s+', ' ', name.strip()).split()
    normalized = set()
    for w in words:
        while True:
            if w.startswith('ال') and len(w) > 2:
                w = w[2:]
            elif w.startswith('و'):
                w = w[1:]
            else:
                break
        if w:
            normalized.add(w)
    return ' '.join(sorted(normalized))

SECTIONS_FIXES = [
    "الآداب", "رياضيات", "علوم تجريبية", "علوم تقنية",
    "الاقتصاد و التصرف", "علوم إعلامية", "رياضة",
]

def _get_best_section(name: str, user):
    """Find the best Section matching `name`: prefer SECTIONS_FIXES match, else earliest id."""
    if not name:
        return None
    key = _section_key(name)
    matches = [s for s in Section.objects.filter(user=user) if _section_key(s.nom) == key]
    if not matches:
        return None
    # Prefer section whose name is in SECTIONS_FIXES (lowest index)
    best = matches[0]
    for s in matches:
        best_idx = SECTIONS_FIXES.index(best.nom) if best.nom in SECTIONS_FIXES else -1
        cur_idx = SECTIONS_FIXES.index(s.nom) if s.nom in SECTIONS_FIXES else -1
        if cur_idx >= 0 and (best_idx < 0 or cur_idx < best_idx):
            best = s
    return best

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_section(request):
    user = request.user
    nom  = request.data.get("nom", "").strip()
    if not nom:
        return Response({"error": "Nom requis"}, status=400)
    key = _section_key(nom)
    existing = Section.objects.filter(user=user)
    for s in existing:
        if _section_key(s.nom) == key:
            return Response({"id": s.id, "nom": s.nom}, status=200)
    if existing.count() >= 7:
        return Response({"error": "Maximum sections atteint"}, status=400)
    section = Section.objects.create(nom=nom, user=user)
    return Response({"id": section.id, "nom": section.nom})

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_section(request, id):
    section = Section.objects.filter(id=id, user=request.user).first()
    if not section:
        return Response({"error": "Not found"}, status=404)
    section.delete()
    return Response({"success": True})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deduplicate_sections(request):
    user = request.user
    sections = list(Section.objects.filter(user=user).order_by('id'))
    seen: dict[str, Section] = {}
    deleted = 0
    for s in sections:
        key = _section_key(s.nom)
        if key in seen:
            s.delete()
            deleted += 1
        else:
            seen[key] = s
    return Response({"deleted": deleted})

# ==================== TEMPLATE EXCEL ====================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_template(request):
    df = pd.DataFrame({
        "Serie":   ["01234", "05678"],
        "num_ins": ["12345", "67890"]
    })
    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = 'attachment; filename=template_inscriptions.xlsx'
    df.to_excel(response, index=False)
    return response

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def import_matieres(request):
    """Import matieres + matiere_sections from Excel (no examens created)."""
    file = request.FILES.get('file')
    if not file:
        return Response({"error": "لم يتم رفع أي ملف"}, status=400)
    try:
        df = pd.read_excel(file, dtype=str)
        df.columns = [str(c).strip() for c in df.columns]
    except Exception as e:
        return Response({"error": f"خطأ في قراءة الملف: {e}"}, status=400)

    cols = list(df.columns)
    errors = []
    created_matieres = 0
    created_ms = 0

    # Map common column names (Arabic, French, English variations)
    def _match_col(*names):
        for n in names:
            for c in cols:
                if c.strip().lower() == n.strip().lower():
                    return c
        return None

    col_mat = _match_col('matiere', 'مادة', 'المادة', 'matière', 'subject')
    col_sec = _match_col('section', 'شعبة', 'الشعبة', 'filière', 'filiere')
    col_dur = _match_col('duree', 'durée', 'مدة', 'المدة', 'heures', 'ساعات', 'hours', 'temps', 'time')
    col_type = _match_col('type', 'النوع', 'نوع', 'kind', 'category')

    for idx, row in df.iterrows():
        mat_nom = str(row.get(col_mat, '')).strip() if col_mat else ''
        sec_nom = str(row.get(col_sec, '')).strip() if col_sec else ''
        duree_str = str(row.get(col_dur, '')).strip() if col_dur else ''
        type_val = str(row.get(col_type, 'obligatoire')).strip() if col_type else 'obligatoire'

        if not mat_nom:
            errors.append(f"سطر {idx+2}: اسم المادة فارغ"); continue

        matiere = Matiere.objects.filter(nom=mat_nom).first()
        if not matiere:
            matiere = Matiere.objects.create(nom=mat_nom)
            created_matieres += 1

        section = _get_best_section(sec_nom, request.user) if sec_nom else None
        if not section:
            errors.append(f"سطر {idx+2}: الشعبة '{sec_nom}' غير موجودة"); continue

        if duree_str:
            try:
                heures = float(duree_str.replace(',', '.'))
            except ValueError:
                heures = 2.0
            if type_val not in ('obligatoire', 'optionnelle'):
                type_val = 'obligatoire'
            _, ms_created = MatiereSection.objects.get_or_create(
                matiere=matiere, section=section,
                defaults={'heures': heures, 'type': type_val}
            )
            if ms_created:
                created_ms += 1

    info = f"الأعمدة المكتشفة: {cols}"
    return Response({
        "created_matieres": created_matieres,
        "created_durees": created_ms,
        "errors": errors,
        "total_errors": len(errors),
        "_columns": cols,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def import_examens(request):
    file = request.FILES.get('file')
    if not file:
        return Response({"error": "لم يتم رفع أي ملف"}, status=400)
    try:
        df = pd.read_excel(file, dtype=str)
        df.columns = [str(c).strip() for c in df.columns]
    except Exception as e:
        return Response({"error": f"خطأ في قراءة الملف: {e}"}, status=400)

    # Allow passing session_id to import into a specific session
    session_id = request.data.get('session_id') or request.GET.get('session_id')
    session = None
    if session_id:
        session = Session.objects.filter(id=session_id, user=request.user).first()
    if not session:
        session = Session.objects.filter(user=request.user).first()
    if not session:
        return Response({"error": "لا توجد دورة"}, status=400)

    errors = []
    created_matieres = 0
    created_ms = 0
    created_examens = 0

    for idx, row in df.iterrows():
        mat_nom  = str(row.get('matiere', '')).strip()
        sec_nom  = str(row.get('section', '')).strip()
        type_val = str(row.get('type', 'obligatoire')).strip()
        duree_str = str(row.get('duree', '')).strip()
        date_val = str(row.get('date', '')).strip()
        h_debut  = str(row.get('heure_debut', '')).strip()
        h_fin    = str(row.get('heure_fin', '')).strip()
        # Normalize date: strip time, handle DD/MM/YYYY → YYYY-MM-DD
        date_val = date_val.split(' ')[0].split('T')[0]
        for sep in '/-.':
            if sep in date_val:
                parts = date_val.split(sep)
                if len(parts) == 3 and len(parts[2]) == 4:
                    date_val = f"{parts[2]}-{parts[0].zfill(2)}-{parts[1].zfill(2)}"
                break
        # Strip date prefix from time fields (e.g. "2026-06-03 09:00:00" → "09:00")
        if isinstance(h_debut, str) and ' ' in h_debut:
            h_debut = h_debut.split(' ')[1]
        if isinstance(h_fin, str) and ' ' in h_fin:
            h_fin = h_fin.split(' ')[1]
        if isinstance(h_debut, str) and ':' in h_debut:
            h_debut = ':'.join(h_debut.split(':')[:2])
        if isinstance(h_fin, str) and ':' in h_fin:
            h_fin = ':'.join(h_fin.split(':')[:2])

        if not mat_nom:
            errors.append(f"سطر {idx+2}: اسم المادة فارغ"); continue

        matiere = Matiere.objects.filter(nom=mat_nom).first()
        if not matiere:
            matiere = Matiere.objects.create(nom=mat_nom)
            created_matieres += 1

        section = _get_best_section(sec_nom, request.user) if sec_nom else None

        if duree_str and section:
            try:
                heures = float(duree_str)
            except ValueError:
                heures = 2.0
            if type_val not in ('obligatoire', 'optionnelle'):
                type_val = 'obligatoire'
            _, ms_created = MatiereSection.objects.get_or_create(
                matiere=matiere, section=section,
                defaults={'heures': heures, 'type': type_val}
            )
            if ms_created:
                created_ms += 1

        if date_val and h_debut and h_fin:
            if not section:
                errors.append(f"سطر {idx+2}: الشعبة مطلوبة للامتحان"); continue
            existing = Examen.objects.filter(
                user=request.user, session=session, matiere=matiere, section=section,
                date=date_val,
            ).first()
            if existing:
                errors.append(f"سطر {idx+2}: امتحان {mat_nom} / {sec_nom} في {date_val} موجود مسبقاً"); continue
            Examen.objects.create(
                user=request.user, session=session,
                date=date_val, heure_debut=h_debut, heure_fin=h_fin,
                matiere=matiere, section=section,
            )
            created_examens += 1

    return Response({
        "created_matieres": created_matieres,
        "created_durees": created_ms,
        "created_examens": created_examens,
        "errors": errors,
        "total_errors": len(errors),
    })

# ==================== MATIERES SECTIONS ====================
class MatiereSectionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = MatiereSectionSerializer
    queryset = MatiereSection.objects.all()

    def get_queryset(self):
        return MatiereSection.objects.filter(section__user=self.request.user)

# ==================== TEMPLATE MATIERES ====================
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def template_matieres(request):
    if request.method == 'GET':
        tm = TemplateMatiere.objects.first()
        if not tm:
            return Response({"exists": False})
        return Response({
            "exists": True,
            "updated_at": tm.updated_at.isoformat(),
            "matieres": tm.matieres,
            "matiere_sections": tm.matiere_sections,
        })
    elif request.method == 'POST':
        matieres = list(Matiere.objects.all().values("id", "nom"))
        sections = list(MatiereSection.objects.filter(section__user=request.user).select_related('section').values(
            "id", "matiere", "section", "heures", "section__nom"
        ))
        for s in sections:
            s["section_nom"] = s.pop("section__nom")
        tm, _ = TemplateMatiere.objects.get_or_create(pk=1)
        tm.matieres = matieres
        tm.matiere_sections = sections
        tm.save()
        return Response({"success": True, "matieres_count": len(matieres), "sections_count": len(sections)})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def restore_template_matieres(request):
    tm = TemplateMatiere.objects.first()
    if not tm:
        return Response({"error": "لا يوجد قالب محفوظ"}, status=400)
    user_sections = {s.nom: s.id for s in Section.objects.filter(user=request.user)}
    created = 0
    for ms_data in tm.matiere_sections:
        section_nom = ms_data.get("section_nom")
        if section_nom and section_nom in user_sections:
            matiere_id = ms_data["matiere"]
            if Matiere.objects.filter(id=matiere_id).exists():
                _, was_created = MatiereSection.objects.get_or_create(
                    matiere_id=matiere_id,
                    section_id=user_sections[section_nom],
                    defaults={"heures": ms_data["heures"]}
                )
                if was_created:
                    created += 1
    return Response({"success": True, "restored_count": created})

# ==================== TEMPLATE EXAMENS ====================
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def template_examens(request):
    if request.method == 'GET':
        te = TemplateExamen.objects.filter(user=request.user).first()
        if not te:
            te = TemplateExamen.objects.filter(user__isnull=True).first()
        if not te:
            return Response({"exists": False})
        return Response({
            "exists": True,
            "updated_at": te.updated_at.isoformat(),
            "examens": te.examens,
        })
    elif request.method == 'POST':
        session_ids = list(Session.objects.filter(user=request.user).values_list('id', flat=True))
        examens = []
        if session_ids:
            for e in Examen.objects.filter(session__in=session_ids):
                examens.append({
                    "id": e.id,
                    "session": e.session_id,
                    "date": str(e.date),
                    "heure_debut": str(e.heure_debut),
                    "heure_fin": str(e.heure_fin),
                    "matiere": e.matiere_id,
                    "section": e.section_id,
                })
        te, _ = TemplateExamen.objects.get_or_create(user=request.user)
        te.examens = examens
        te.save()
        return Response({"success": True, "count": len(examens)})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def restore_template_examens(request):
    te = TemplateExamen.objects.filter(user=request.user).first()
    if not te:
        te = TemplateExamen.objects.filter(user__isnull=True).first()
    if not te:
        return Response({"error": "لا يوجد قالب محفوظ"}, status=400)
    user_section_ids = list(Section.objects.filter(user=request.user).values_list('id', flat=True))
    Examen.objects.filter(section__in=user_section_ids).delete()
    restored = 0
    for ex_data in te.examens:
        section_id = ex_data.get("section")
        if section_id in user_section_ids:
            Examen.objects.create(
                user=request.user,
                session_id=ex_data["session"],
                date=ex_data["date"],
                heure_debut=ex_data["heure_debut"],
                heure_fin=ex_data["heure_fin"],
                matiere_id=ex_data["matiere"],
                section_id=section_id,
            )
            restored += 1
    return Response({"success": True, "restored": restored})

# ==================== MATIERES PAR SECTION ====================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def matieres_by_section(request):
    section_id = request.query_params.get('section')
    if not section_id:
        return Response({"error": "section id requis"}, status=400)
    try:
        matiere_sections = MatiereSection.objects.filter(
            section_id=int(section_id)
        ).select_related('matiere', 'section')
        result = [
            {"id": ms.matiere.id, "nom": ms.matiere.nom, "matiere_section_id": ms.id, "type": ms.type, "duree": round(ms.heures * 60)}
            for ms in matiere_sections
        ]
        return Response(result)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

# ==================== SERIE LIST VIEW ====================
class SerieListView(ListAPIView):
    serializer_class   = SerieSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Serie.objects.filter(user=self.request.user)
        section  = self.request.query_params.get('section')
        if section:
            queryset = queryset.filter(section__nom__icontains=section)
        return queryset

# ==================== IMPORT DATA ====================
import urllib.request, os, tempfile, traceback
from django.core.management import call_command
from django.http import JsonResponse

@api_view(['GET'])
@permission_classes([])
def import_data(request):
    try:
        url = "https://tmpfiles.org/dl/wZwJcBX80mDg/data_export.json"
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
            path = f.name
        urllib.request.urlretrieve(url, path)
        size = os.path.getsize(path)
        if size == 0:
            return JsonResponse({"error": "empty file"}, status=500)
        from io import StringIO
        out = StringIO()
        call_command("loaddata", path, stdout=out, stderr=out)
        os.unlink(path)
        return JsonResponse({"result": out.getvalue()[:1000]})
    except Exception as e:
        return JsonResponse({"error": str(e), "traceback": traceback.format_exc()}, status=500)



