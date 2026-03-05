import React from 'react';
import { AnalysisResult } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface HistoryProps {
  items: AnalysisResult[];
  onView: (item: AnalysisResult) => void;
  onDelete: (item: AnalysisResult) => void;
}

export const History: React.FC<HistoryProps> = ({ items, onView, onDelete }) => {
  const { t, lang } = useLanguage();

  // Per-language localized mock data for App Store screenshots
  const localizedMocks: Record<string, AnalysisResult[]> = {
    en: [{ fileName: 'Parking_Ticket.pdf', category: 'legal', summary: 'You received a $75 parking fine for stopping in a prohibited zone. Payment is due by January 4th.', timestamp: 'Just now', keyPoints: ['Violation: No-stopping zone (Code 402)', 'Fine amount: $75.00', 'Due date: January 4, 2027', 'Failure to pay may result in a $150 late fee.'] }, { fileName: 'NDA_Draft_v2.docx', summary: 'Summary of confidentiality terms and duration.', timestamp: 'Yesterday', keyPoints: [] }, { fileName: 'Lease_Agreement.pdf', summary: 'Breakdown of tenant rights and deposit return.', timestamp: 'Oct 12', keyPoints: [] }],
    fr: [{ fileName: 'Amende_Stationnement.pdf', category: 'legal', summary: "Vous avez reçu une amende de 75 € pour arrêt en zone interdite. Paiement avant le 4 janvier.", timestamp: "À l'instant", keyPoints: ["Infraction : Zone d'arrêt interdit (Code 402)", 'Montant : 75,00 €', 'Échéance : 4 janvier 2027', 'Défaut de paiement : majoration à 150 €.'] }, { fileName: 'Contrat_NDA_v2.docx', summary: 'Résumé des clauses de confidentialité et durée.', timestamp: 'Hier', keyPoints: [] }, { fileName: 'Bail_2024.pdf', summary: "Résumé des droits du locataire et du retour de dépôt.", timestamp: '12 oct.', keyPoints: [] }],
    de: [{ fileName: 'Bussgeldbescheid.pdf', category: 'legal', summary: 'Sie haben einen Bußgeldbescheid über 75 € für Parken im Halteverbot erhalten. Zahlung bis 4. Januar.', timestamp: 'Gerade eben', keyPoints: ['Verstoß: Absolutes Halteverbot (§ 402)', 'Betrag: 75,00 €', 'Fälligkeitsdatum: 4. Januar 2027', 'Nichtzahlung erhöht Betrag auf 150 €.'] }, { fileName: 'NDA_Entwurf_v2.docx', summary: 'Zusammenfassung der Vertraulichkeitsklauseln.', timestamp: 'Gestern', keyPoints: [] }, { fileName: 'Mietvertrag_2024.pdf', summary: 'Mieterrechte und Kautionsrückgabe.', timestamp: '12. Okt.', keyPoints: [] }],
    es: [{ fileName: 'Multa_Aparcamiento.pdf', category: 'legal', summary: 'Recibiste una multa de 75 € por estacionar en zona prohibida. Vence el 4 de enero.', timestamp: 'Ahora mismo', keyPoints: ['Infracción: Zona de parada prohibida (Código 402)', 'Importe: 75,00 €', 'Fecha límite: 4 de enero de 2027', 'El impago puede resultar en una multa de 150 €.'] }, { fileName: 'NDA_Borrador_v2.docx', summary: 'Resumen de cláusulas de confidencialidad.', timestamp: 'Ayer', keyPoints: [] }, { fileName: 'Contrato_Arrendamiento.pdf', summary: 'Derechos del inquilino y devolución de depósito.', timestamp: '12 oct.', keyPoints: [] }],
    it: [{ fileName: 'Verbale_Parcheggio.pdf', category: 'legal', summary: 'Hai ricevuto una multa di 75 € per sosta vietata. Pagamento entro il 4 gennaio.', timestamp: 'Poco fa', keyPoints: ['Violazione: Zona di sosta vietata (Codice 402)', 'Importo: 75,00 €', 'Scadenza: 4 gennaio 2027', 'Il mancato pagamento comporta una multa di 150 €.'] }, { fileName: 'NDA_Bozza_v2.docx', summary: 'Riepilogo delle clausole di riservatezza.', timestamp: 'Ieri', keyPoints: [] }, { fileName: 'Contratto_Affitto_2024.pdf', summary: 'Diritti del locatario e deposito cauzionale.', timestamp: '12 ott.', keyPoints: [] }],
    pt: [{ fileName: 'Multa_Estacionamento.pdf', category: 'legal', summary: 'Você recebeu uma multa de R$ 75 por estacionar em zona proibida. Vencimento em 4 de janeiro.', timestamp: 'Agora mesmo', keyPoints: ['Infração: Zona de parada proibida (Código 402)', 'Valor: R$ 75,00', 'Vencimento: 4 de janeiro de 2027', 'O não pagamento resulta em multa de R$ 150.'] }, { fileName: 'NDA_Rascunho_v2.docx', summary: 'Resumo das cláusulas de confidencialidade.', timestamp: 'Ontem', keyPoints: [] }, { fileName: 'Contrato_Aluguel_2024.pdf', summary: 'Direitos do inquilino e devolução do depósito.', timestamp: '12 out.', keyPoints: [] }],
    zh: [{ fileName: '停车罚单.pdf', category: 'legal', summary: '您因在禁止停车区停车而收到75元罚款，须在1月4日前缴纳。', timestamp: '刚刚', keyPoints: ['违规：禁止停车区 (第402条)', '罚款金额：75.00元', '缴款截止日：2027年1月4日', '逾期不缴将产生150元滞纳金。'] }, { fileName: '保密协议草稿v2.docx', summary: '保密条款和期限摘要。', timestamp: '昨天', keyPoints: [] }, { fileName: '租赁合同_2024.pdf', summary: '租户权利和押金退还明细。', timestamp: '10月12日', keyPoints: [] }],
    hi: [{ fileName: 'पार्किंग_उल्लंघन.pdf', category: 'legal', summary: 'आपको नो-पार्किंग जोन में खड़े होने के लिए ₹75 का जुर्माना मिला है।', timestamp: 'अभी', keyPoints: ['उल्लंघन: नो-स्टॉपिंग ज़ोन (कोड 402)', 'जुर्माना: ₹75.00', 'भुगतान की तिथि: 4 जनवरी 2027', 'भुगतान न करने पर ₹150 का दंड।'] }, { fileName: 'NDA_मसौदा_v2.docx', summary: 'गोपनीयता शर्तों का सारांश।', timestamp: 'कल', keyPoints: [] }, { fileName: 'किराया_समझौता_2024.pdf', summary: 'किरायेदार के अधिकार और जमानत राशि।', timestamp: '12 अक्टू.', keyPoints: [] }],
    ar: [{ fileName: 'مخالفة_وقوف.pdf', category: 'legal', summary: 'لقد تلقيت غرامة وقوف بقيمة 75 ريال في منطقة محظورة. تاريخ الاستحقاق 4 يناير.', timestamp: 'الآن', keyPoints: ['المخالفة: منطقة وقوف محظورة (الكود 402)', 'مبلغ الغرامة: 75.00 ريال', 'تاريخ الاستحقاق: 4 يناير 2027', 'عدم السداد يؤدي إلى غرامة إضافية 150 ريال.'] }, { fileName: 'مسودة_اتفاقية_السرية_v2.docx', summary: 'ملخص بنود السرية والمدة.', timestamp: 'الأمس', keyPoints: [] }, { fileName: 'عقد_إيجار_2024.pdf', summary: 'حقوق المستأجر وإعادة التأمين.', timestamp: '12 أكت.', keyPoints: [] }],
    ru: [{ fileName: 'Штраф_Парковка.pdf', category: 'legal', summary: 'Вы получили штраф 75 руб. за парковку в запрещённом месте. Срок оплаты — 4 января.', timestamp: 'Только что', keyPoints: ['Нарушение: Зона запрета остановки (Код 402)', 'Сумма штрафа: 75,00 руб.', 'Срок оплаты: 4 января 2027', 'Неоплата — удвоение штрафа до 150 руб.'] }, { fileName: 'NDA_Проект_v2.docx', summary: 'Сводка условий конфиденциальности.', timestamp: 'Вчера', keyPoints: [] }, { fileName: 'Договор_аренды_2024.pdf', summary: 'Права арендатора и возврат залога.', timestamp: '12 окт.', keyPoints: [] }],
    bn: [{ fileName: 'পার্কিং_জরিমানা.pdf', category: 'legal', summary: 'আপনি নিষিদ্ধ পার্কিং জোনে গাড়ি রাখার জন্য ৭৫ টাকা জরিমানা পেয়েছেন।', timestamp: 'এইমাত্র', keyPoints: ['লঙ্ঘন: নো-স্টপিং জোন (কোড ৪০২)', 'জরিমানার পরিমাণ: ৭৫.০০ টাকা', 'পরিশোধের তারিখ: ৪ জানুয়ারি ২০২৭', 'পরিশোধ না করলে ১৫০ টাকা জরিমানা।'] }, { fileName: 'NDA_খসড়া_v2.docx', summary: 'গোপনীয়তার শর্তের সারসংক্ষেপ।', timestamp: 'গতকাল', keyPoints: [] }, { fileName: 'ভাড়া_চুক্তি_2024.pdf', summary: 'ভাড়াটেদের অধিকার এবং জামানত ফেরত।', timestamp: '১২ অক্টো.', keyPoints: [] }],
  };

  const displayItems = items.length > 0 ? items : (localizedMocks[lang] ?? localizedMocks['en']);

  return (
    <div className="flex-1 px-4 py-4 pb-24 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 px-2">{t.history}</h1>

      {/* Privacy Banner */}
      <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 flex gap-3 items-start mb-6">
        <div className="flex-shrink-0 size-8 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center text-primary dark:text-blue-300">
          <span className="material-symbols-rounded text-sm">lock</span>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Stored locally only</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
            Your documents are encrypted and stored on your device.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
          <span className="material-symbols-rounded">search</span>
        </div>
        <input
          className="w-full bg-white dark:bg-surface-dark border-none rounded-xl py-3 pl-10 pr-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary shadow-sm"
          placeholder="Search past explanations..."
          type="text"
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 mb-1">Recent</h2>

        {displayItems.map((item, idx) => (
          <div key={idx} className="group flex flex-col bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 size-12 rounded-lg flex items-center justify-center ${item.fileName.endsWith('pdf') ? 'bg-red-50 dark:bg-red-900/20 text-red-500' :
                item.fileName.endsWith('docx') ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' : 'bg-purple-50 dark:bg-purple-900/20 text-purple-500'
                }`}>
                <span className="material-symbols-rounded text-2xl">
                  {item.fileName.endsWith('pdf') ? 'picture_as_pdf' : 'description'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate pr-2">{item.fileName}</h3>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{item.timestamp}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">{item.summary}</p>

                <div className="mt-4 flex items-center justify-end gap-3 border-t border-gray-50 dark:border-gray-700 pt-3">
                  <button onClick={() => onDelete(item)} className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-500 transition-colors">
                    <span className="material-symbols-rounded text-sm">delete</span>
                    Delete
                  </button>
                  <button onClick={() => onView(item)} className="flex items-center gap-1 text-xs font-medium text-primary bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                    <span className="material-symbols-rounded text-sm">visibility</span>
                    View
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};