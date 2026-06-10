from django.urls import path, include
from .views import (
    SessionViewSet,
    SalleViewSet,
    MatiereViewSet,
    SerieViewSet,
    ExamenViewSet,
    ExamenSalleViewSet,
    InscriptionViewSet,
    MatiereSectionViewSet,
    SerieListView,
    general_info,
    add_section,
    delete_section,
    deduplicate_sections,
    import_examens,
    import_matieres,
    inscriptions_by_serie,
    bulk_inscriptions,
    import_candidats,
    candidats_count,
    import_excel,
    download_template,
    matieres_by_section,
    template_matieres,
    restore_template_matieres,
    template_examens,
    restore_template_examens,
)
from .generate_views import generate_documents, download_document, generate_presence, generate_sortie, download_combined_pdf, generate_agent_document, download_zip, download_invitations, download_invitations_pdf, generate_rec, generate_verification
from .surveillance_views import generate_surveillance, get_surveillance_plans, get_surveillance_plan_detail, generate_groups_surveillance, update_surveillance_assignment, surveillance_groups, download_surveillance_doc, confirm_surveillance_schedule, generate_surv_report

from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'sessions', SessionViewSet)
router.register(r'salles-exam', SalleViewSet, basename='salles-exam')
router.register(r'salles', SalleViewSet, basename='salles')
router.register(r'matieres', MatiereViewSet)
router.register(r'series', SerieViewSet)
router.register(r'examens', ExamenViewSet)
router.register(r'inscriptions', InscriptionViewSet)
router.register(r'matieres-sections', MatiereSectionViewSet)
router.register(r'examen-salles', ExamenSalleViewSet)

urlpatterns = [
    # Routes router
    path('', include(router.urls)),

    # Routes API generales
    path('general/', general_info, name='general_info'),
    path('add-section/', add_section, name='add_section'),
    path('delete-section/<int:id>/', delete_section, name='delete_section'),
    path('deduplicate-sections/', deduplicate_sections, name='deduplicate_sections'),

    # Routes inscriptions
    path('inscriptions/by-serie/', inscriptions_by_serie, name='inscriptions_by_serie'),
    path('bulk-inscriptions/', bulk_inscriptions, name='bulk_inscriptions'),

    # Routes import
    path('import-candidats/', import_candidats, name='import_candidats'),
    path('candidats-count/', candidats_count, name='candidats_count'),
    path('import-excel/', import_excel, name='import_excel'),
    path('import-examens/', import_examens, name='import_examens'),
    path('import-matieres/', import_matieres, name='import_matieres'),
    path('download-template/', download_template, name='download_template'),

    # Routes generation documents
    path('generate-documents/', generate_documents, name='generate_documents'),
    path('download-document/<str:doc_id>/', download_document, name='download_document'),
    path('generate-presence/', generate_presence, name='generate_presence'),
    path('generate-sortie/', generate_sortie, name='generate_sortie'),
    path('download-combined-pdf/', download_combined_pdf, name='download_combined_pdf'),
    path('generate-agent/', generate_agent_document, name='generate_agent_document'),
    path('generate-rec/', generate_rec, name='generate_rec'),
    path('generate-verification/', generate_verification, name='generate_verification'),
    path('download-zip/', download_zip, name='download_zip'),
    path('download-invitations/', download_invitations, name='download_invitations'),
    path('download-invitations-pdf/', download_invitations_pdf, name='download_invitations_pdf'),

    # Routes listes
    path('series-list/', SerieListView.as_view(), name='series_list'),
    path('matieres-by-section/', matieres_by_section, name='matieres_by_section'),
    path('template-matieres/', template_matieres, name='template_matieres'),
    path('template-matieres/restore/', restore_template_matieres, name='restore_template_matieres'),
    path('template-examens/', template_examens, name='template_examens'),
    path('template-examens/restore/', restore_template_examens, name='restore_template_examens'),

    # Routes surveillance
    path('generate-surveillance/', generate_surveillance, name='generate_surveillance'),
    path('generate-groups-surveillance/', generate_groups_surveillance, name='generate_groups_surveillance'),
    path('surveillance-plans/', get_surveillance_plans, name='surveillance_plans'),
    path('surveillance-plans/<int:plan_id>/', get_surveillance_plan_detail, name='surveillance_plan_detail'),
    path('surveillance-assignments/<int:assignment_id>/', update_surveillance_assignment, name='update_surveillance_assignment'),
    path('surveillance-groups/', surveillance_groups, name='surveillance_groups'),
    path('surveillance-download-doc/', download_surveillance_doc, name='download_surveillance_doc'),
    path('confirm-surveillance-schedule/', confirm_surveillance_schedule, name='confirm_surveillance_schedule'),
    path('generate-surv-report/', generate_surv_report, name='generate_surv_report'),
]