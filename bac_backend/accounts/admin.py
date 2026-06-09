from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django import forms
from .models import User

class UserChangeForm(forms.ModelForm):
    password = forms.CharField(
        widget=forms.TextInput(attrs={'style': 'direction:ltr'}),
        required=False,
        label="كلمة المرور",
    )
    class Meta:
        model = User
        fields = '__all__'

class UserCreationForm(forms.ModelForm):
    password = forms.CharField(
        widget=forms.TextInput(attrs={'style': 'direction:ltr'}),
        label="كلمة المرور",
    )
    class Meta:
        model = User
        fields = ['username', 'password', 'role', 'centre']

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'password', 'role', 'centre'),
        }),
    )
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('معلومات شخصية', {'fields': ('first_name', 'last_name', 'email')}),
        ('الصلاحيات', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('معلومات إضافية', {
            'fields': ('role', 'centre', 'annee_scolaire', 'delegation', 'nombre_candidats', 'nombre_salles', 'nom_admin'),
        }),
    )
    list_display = ('username', 'role', 'centre', 'is_staff')
    search_fields = ('username', 'centre')