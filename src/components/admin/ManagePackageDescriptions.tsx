import React, { useState, useEffect } from 'react';
import { PACKAGE_TEMPLATES } from '../../data/packageTemplates';
import { quotationStorageService } from '../../services/quotationStorageService';
import { Layers, Save, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Globe, FileText, RotateCcw } from 'lucide-react';

interface ManagePackageDescriptionsProps {
  onBackToList: () => void;
  language?: 'en' | 'es';
}

export const ManagePackageDescriptions: React.FC<ManagePackageDescriptionsProps> = ({
  onBackToList,
  language = 'en',
}) => {
  const [isEs, setIsEs] = useState<boolean>(language === 'es');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(PACKAGE_TEMPLATES[0]?.id || '');
  const [overrides, setOverrides] = useState<Record<string, { overviewEn: string; overviewEs: string }>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showRestoreModal, setShowRestoreModal] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state for current selected template
  const [currentOverviewEn, setCurrentOverviewEn] = useState<string>('');
  const [currentOverviewEs, setCurrentOverviewEs] = useState<string>('');

  const tr = (en: string, es: string) => (isEs ? es : en);

  // Load existing overrides from Supabase on mount
  useEffect(() => {
    loadOverrides();
  }, []);

  const loadOverrides = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await quotationStorageService.getPackageDescriptionOverrides();
      setOverrides(data);

      // Initialize fields for initial selected template
      const initialTmpl = PACKAGE_TEMPLATES.find((t) => t.id === selectedTemplateId) || PACKAGE_TEMPLATES[0];
      if (initialTmpl) {
        const ov = data[initialTmpl.id];
        setCurrentOverviewEn(ov ? ov.overviewEn : initialTmpl.packageSnapshot.overview);
        setCurrentOverviewEs(
          ov ? ov.overviewEs : (initialTmpl.packageSnapshotEs?.overview || initialTmpl.packageSnapshot.overview)
        );
      }
    } catch (err: any) {
      console.error('Error loading package description overrides:', err);
      setErrorMsg(err?.message || 'Failed to load stored package description overrides from Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  // When selected template changes, update form inputs
  useEffect(() => {
    const tmpl = PACKAGE_TEMPLATES.find((t) => t.id === selectedTemplateId);
    if (tmpl) {
      const ov = overrides[tmpl.id];
      setCurrentOverviewEn(ov ? ov.overviewEn : tmpl.packageSnapshot.overview);
      setCurrentOverviewEs(
        ov ? ov.overviewEs : (tmpl.packageSnapshotEs?.overview || tmpl.packageSnapshot.overview)
      );
    }
  }, [selectedTemplateId, overrides]);

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await quotationStorageService.savePackageDescriptionOverride(
        selectedTemplateId,
        currentOverviewEn,
        currentOverviewEs
      );

      // Update local state after successful verification read-back
      setOverrides((prev) => ({
        ...prev,
        [selectedTemplateId]: {
          overviewEn: currentOverviewEn,
          overviewEs: currentOverviewEs,
        },
      }));

      setSuccessMsg(
        tr(
          'Default Experience Overview saved and verified successfully in Supabase! Future quotations using this package will automatically use this wording.',
          '¡Descripción general guardada y verificada con éxito en Supabase! Las futuras cotizaciones que utilicen este paquete usarán automáticamente este texto.'
        )
      );
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Error saving package override:', err);
      setErrorMsg(err?.message || 'Failed to save package description override.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreClick = () => {
    if (!overrides[selectedTemplateId]) {
      setSuccessMsg(
        tr(
          'No custom override saved for this template. The original default description is already active.',
          'No hay una descripción personalizada guardada para esta plantilla. La descripción original ya está activa.'
        )
      );
      setTimeout(() => setSuccessMsg(null), 4000);
      return;
    }
    setShowRestoreModal(true);
  };

  const handleConfirmRestore = async () => {
    setShowRestoreModal(false);
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await quotationStorageService.deletePackageDescriptionOverride(selectedTemplateId);

      setOverrides((prev) => {
        const next = { ...prev };
        delete next[selectedTemplateId];
        return next;
      });

      const tmpl = PACKAGE_TEMPLATES.find((t) => t.id === selectedTemplateId);
      if (tmpl) {
        setCurrentOverviewEn(tmpl.packageSnapshot.overview);
        setCurrentOverviewEs(tmpl.packageSnapshotEs?.overview || tmpl.packageSnapshot.overview);
      }

      setSuccessMsg(
        tr(
          'Original description restored successfully from Supabase database.',
          'Descripción original restaurada con éxito desde la base de datos de Supabase.'
        )
      );
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Error restoring original description:', err);
      setErrorMsg(err?.message || 'Failed to restore original description.');
    } finally {
      setIsSaving(false);
    }
  };

  const currentTemplate = PACKAGE_TEMPLATES.find((t) => t.id === selectedTemplateId) || PACKAGE_TEMPLATES[0];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Header Card */}
      <div className="bg-[#0e3b2f] text-white rounded-xl p-6 sm:p-8 shadow-lg border border-[#22483d] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono uppercase px-2.5 py-0.5 rounded bg-[#1b4b3d] text-[#c9a96e] border border-[#2d5f50]">
              {tr('CMS Administration', 'Administración CMS')}
            </span>
            <span className="text-xs text-[#a3c9bd]">
              {tr('Package Template Overrides', 'Personalización de Plantillas')}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-[#f7f2ea]">
            {tr('Manage Package Descriptions', 'Administrar Descripciones de Paquetes')}
          </h1>
          <p className="text-xs sm:text-sm text-[#b2d6cc] mt-1 max-w-2xl">
            {tr(
              'Customize the default Experience Overview for each Guna Yala package template. Changes are persisted securely in Supabase and applied automatically to new quotations.',
              'Personalice la descripción general de la experiencia para cada plantilla de paquete de Guna Yala. Los cambios se guardan de forma segura en Supabase.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onBackToList}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#184437] hover:bg-[#205243] text-[#e8dbbf] font-medium text-xs rounded-lg transition-colors border border-[#2d5f50]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{tr('Back to Quotations', 'Volver a Cotizaciones')}</span>
          </button>

          <button
            onClick={() => setIsEs(!isEs)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#184437] hover:bg-[#205243] text-white font-medium text-xs rounded-lg transition-colors border border-[#2d5f50]"
            title="Switch Language / Cambiar Idioma"
          >
            <Globe className="w-4 h-4 text-[#c9a96e]" />
            <span>{isEs ? '🇪🇸 ES' : '🇬🇧 EN'}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-950 flex items-center gap-3 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-lg text-xs text-red-950 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={loadOverrides}
            className="px-3 py-1 bg-red-800 hover:bg-red-900 text-white font-medium rounded text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#0e3b2f]">
          <Loader2 className="w-8 h-8 animate-spin text-[#c9a96e] mb-3" />
          <span className="text-xs font-mono font-medium">Loading package templates & overrides from Supabase...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Template Selector List */}
          <div className="lg:col-span-4 bg-white rounded-xl p-5 border border-[#e5dec9] shadow-sm space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-[#f0eae0]">
              <Layers className="w-4 h-4 text-[#c9a96e]" />
              <h2 className="text-sm font-semibold text-[#0e3b2f]">
                {tr('Select Package Template', 'Seleccionar Plantilla')}
              </h2>
            </div>

            <div className="space-y-2">
              {PACKAGE_TEMPLATES.map((tmpl) => {
                const isSelected = tmpl.id === selectedTemplateId;
                const hasOverride = Boolean(overrides[tmpl.id]);
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => setSelectedTemplateId(tmpl.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all text-xs flex flex-col gap-1 ${
                      isSelected
                        ? 'bg-[#0e3b2f] text-white border-[#0e3b2f] shadow-sm'
                        : 'bg-[#faf8f5] hover:bg-[#f3eee3] text-[#1c242c] border-[#e5dec9]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold font-serif">
                        {isEs && tmpl.nameEs ? tmpl.nameEs : tmpl.name}
                      </span>
                      {hasOverride && (
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            isSelected ? 'bg-[#1b4b3d] text-[#e8dbbf]' : 'bg-[#e5dec9] text-[#0e3b2f]'
                          }`}
                        >
                          {tr('Customized', 'Personalizado')}
                        </span>
                      )}
                    </div>
                    <div className={`text-[11px] opacity-80 flex items-center gap-2`}>
                      <span>📍 {isEs && tmpl.islandEs ? tmpl.islandEs : tmpl.island}</span>
                      <span>•</span>
                      <span>{isEs && tmpl.cabinCategoryEs ? tmpl.cabinCategoryEs : tmpl.cabinCategory}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Editor for Selected Template */}
          <div className="lg:col-span-8 bg-white rounded-xl p-6 sm:p-8 border border-[#e5dec9] shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0eae0] pb-4">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#c9a96e] font-semibold mb-1">
                  {tr('Editing Package Template', 'Editando Plantilla de Paquete')}
                </div>
                <h2 className="text-xl font-serif font-semibold text-[#0e3b2f]">
                  {isEs && currentTemplate.nameEs ? currentTemplate.nameEs : currentTemplate.name}
                </h2>
                <p className="text-xs text-[#687785] mt-0.5">
                  {tr('Island:', 'Isla:')} {isEs && currentTemplate.islandEs ? currentTemplate.islandEs : currentTemplate.island} |{' '}
                  {tr('Accommodation:', 'Alojamiento:')} {isEs && currentTemplate.cabinCategoryEs ? currentTemplate.cabinCategoryEs : currentTemplate.cabinCategory}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleRestoreClick}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-[#0e3b2f] font-medium text-xs rounded-lg transition-colors border border-[#cfc7b2] shadow-2xs disabled:opacity-50"
                  title="Restore original template description"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#c9a96e]" />
                  <span>{tr('Restore Original', 'Restaurar Original')}</span>
                </button>

                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-[#0e3b2f] hover:bg-[#154d3e] text-[#f7f2ea] font-medium text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#c9a96e]" />
                      <span>{tr('Saving...', 'Guardando...')}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-[#c9a96e]" />
                      <span>{tr('Save Description', 'Guardar Descripción')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* English Overview Editor */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#0e3b2f] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#c9a96e]" />
                  <span>{tr('Default Experience Overview — English', 'Descripción general predeterminada — Inglés')}</span>
                </span>
                <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  🇬🇧 EN
                </span>
              </label>
              <p className="text-[11px] text-[#687785]">
                {tr(
                  'This text appears prominently in English quotations right below the Booking Details card.',
                  'Este texto aparece de forma destacada en las cotizaciones en inglés justo debajo de los detalles de reserva.'
                )}
              </p>
              <textarea
                rows={5}
                value={currentOverviewEn}
                onChange={(e) => setCurrentOverviewEn(e.target.value)}
                placeholder="Enter default experience overview in English..."
                className="w-full p-3.5 border border-[#cfc7b2] rounded-lg text-xs bg-[#faf8f5] focus:bg-white focus:ring-2 focus:ring-[#0e3b2f] focus:outline-none transition-all leading-relaxed font-sans"
              />
            </div>

            {/* Spanish Overview Editor */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold text-[#0e3b2f] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#c9a96e]" />
                  <span>{tr('Default Experience Overview — Spanish', 'Descripción general predeterminada — Español')}</span>
                </span>
                <span className="text-[10px] font-mono bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                  🇪🇸 ES
                </span>
              </label>
              <p className="text-[11px] text-[#687785]">
                {tr(
                  'This text appears prominently in Spanish quotations right below the Booking Details card.',
                  'Este texto aparece de forma destacada en las cotizaciones en español justo debajo de los detalles de reserva.'
                )}
              </p>
              <textarea
                rows={5}
                value={currentOverviewEs}
                onChange={(e) => setCurrentOverviewEs(e.target.value)}
                placeholder="Ingrese la descripción general en español..."
                className="w-full p-3.5 border border-[#cfc7b2] rounded-lg text-xs bg-[#faf8f5] focus:bg-white focus:ring-2 focus:ring-[#0e3b2f] focus:outline-none transition-all leading-relaxed font-sans"
              />
            </div>

            {/* Footer action bar */}
            <div className="pt-4 border-t border-[#f0eae0] flex items-center justify-between">
              <span className="text-[11px] text-[#8a98a5]">
                {tr(
                  'Changes are stored authoritatively in Supabase table public.package_description_overrides.',
                  'Los cambios se almacenan de forma autorizada en la tabla public.package_description_overrides de Supabase.'
                )}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRestoreClick}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-[#0e3b2f] font-medium text-xs rounded-lg transition-colors border border-[#cfc7b2] shadow-2xs disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#c9a96e]" />
                  <span>{tr('Restore Original', 'Restaurar Original')}</span>
                </button>

                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0e3b2f] hover:bg-[#154d3e] text-[#f7f2ea] font-medium text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#c9a96e]" />
                      <span>{tr('Saving...', 'Guardando...')}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-[#c9a96e]" />
                      <span>{tr('Save Description', 'Guardar Descripción')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-[#e5dec9] space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="text-base font-serif font-semibold text-[#0e3b2f]">
                  {tr('Restore Original Description', 'Restaurar Descripción Original')}
                </h3>
                <p className="text-xs text-[#687785]">
                  {tr('Template: ', 'Plantilla: ')}
                  <span className="font-semibold text-[#0e3b2f]">
                    {isEs && currentTemplate.nameEs ? currentTemplate.nameEs : currentTemplate.name}
                  </span>
                </p>
              </div>
            </div>

            <p className="text-xs text-[#334155] leading-relaxed">
              {tr(
                'Are you sure you want to restore the original default description for this template? This will permanently delete the custom override from Supabase. Future quotations will use the original wording.',
                '¿Está seguro de que desea restaurar la descripción original por defecto para esta plantilla? Esto eliminará permanentemente la personalización de Supabase.'
              )}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f0eae0]">
              <button
                onClick={() => setShowRestoreModal(false)}
                disabled={isSaving}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition-colors"
              >
                {tr('Cancel', 'Cancelar')}
              </button>

              <button
                onClick={handleConfirmRestore}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white font-medium text-xs rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>{tr('Restoring...', 'Restaurando...')}</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 text-white" />
                    <span>{tr('Confirm Restore', 'Confirmar Restauración')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
