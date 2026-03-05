const { execSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const { WebSocket } = require('ws');

const adb = process.env.LOCALAPPDATA + '\\Android\\Sdk\\platform-tools\\adb.exe';
const pkg = 'com.documate.app';
const activity = `${pkg}/com.docexplain.documate.MainActivity`;

const mocks = {
    en: { fileName: 'en_Parking_Ticket.pdf', category: 'legal', summary: 'You received a $75 parking fine for stopping in a prohibited zone. Payment is due by January 4th.', keyPoints: ['Violation: No-stopping zone (Code 402)', 'Fine amount: $75.00', 'Due date: January 4, 2027', 'Failure to pay may result in a $150 late fee.'] },
    fr: { fileName: 'fr_Amende_Stationnement.pdf', category: 'legal', summary: "Vous avez reçu une amende de 75 € pour arrêt en zone interdite. Paiement avant le 4 janvier.", keyPoints: ["Infraction : Zone d'arrêt interdit (Code 402)", 'Montant : 75,00 €', 'Échéance : 4 janvier 2027', 'Défaut de paiement : majoration à 150 €.'] },
    de: { fileName: 'de_Bussgeldbescheid.pdf', category: 'legal', summary: 'Sie haben einen Bußgeldbescheid über 75 € für Parken im Halteverbot erhalten. Zahlung bis 4. Januar.', keyPoints: ['Verstoß: Absolutes Halteverbot (§ 402)', 'Betrag: 75,00 €', 'Fälligkeitsdatum: 4. Januar 2027', 'Nichtzahlung erhöht Betrag auf 150 €.'] },
    es: { fileName: 'es_Multa_Aparcamiento.pdf', category: 'legal', summary: 'Recibiste una multa de 75 € por estacionar en zona prohibida. Vence el 4 de enero.', keyPoints: ['Infracción: Zona de parada prohibida (Código 402)', 'Importe: 75,00 €', 'Fecha límite: 4 de enero de 2027', 'El impago puede resultar en una multa de 150 €.'] },
    it: { fileName: 'it_Verbale_Parcheggio.pdf', category: 'legal', summary: 'Hai ricevuto una multa di 75 € per sosta vietata. Pagamento entro il 4 gennaio.', keyPoints: ['Violazione: Zona di sosta vietata (Codice 402)', 'Importo: 75,00 €', 'Scadenza: 4 gennaio 2027', 'Il mancato pagamento comporta una multa di 150 €.'] },
    pt: { fileName: 'pt_Multa_Estacionamento.pdf', category: 'legal', summary: 'Você recebeu uma multa de R$ 75 por estacionar em zona proibida. Vencimento em 4 de janeiro.', keyPoints: ['Infração: Zona de parada proibida (Código 402)', 'Valor: R$ 75,00', 'Vencimento: 4 de janeiro de 2027', 'O não pagamento resulta em multa de R$ 150.'] },
    zh: { fileName: 'zh_停车罚单.pdf', category: 'legal', summary: '您因在禁止停车区停车而收到75元罚款，须在1月4日前缴纳。', keyPoints: ['违规：禁止停车区 (第402条)', '罚款金额：75.00元', '缴款截止日：2027年1月4日', '逾期不缴将产生150元滞纳金。'] },
    hi: { fileName: 'hi_पार्किंग_उल्लंघन.pdf', category: 'legal', summary: 'आपको नो-पार्किंग जोन में खड़े होने के लिए ₹75 का जुर्माना मिला है।', keyPoints: ['उल्लंघन: नो-स्टॉपिंग ज़ोन (कोड 402)', 'जुर्माना: ₹75.00', 'भुगतान की तिथि: 4 जनवरी 2027', 'भुगतान न करने पर ₹150 का दंड।'] },
    ar: { fileName: 'ar_مخالفة_وقوف.pdf', category: 'legal', summary: 'لقد تلقيت غرامة وقوف بقيمة 75 ريال في منطقة محظورة. تاريخ الاستحقاق 4 يناير.', keyPoints: ['المخالفة: منطقة وقوف محظورة (الكود 402)', 'مبلغ الغرامة: 75.00 ريال', 'تاريخ الاستحقاق: 4 يناير 2027', 'عدم السداد يؤدي إلى غرامة إضافية 150 ريال.'] },
    ru: { fileName: 'ru_Штраф_Парковка.pdf', category: 'legal', summary: 'Вы получили штраф 75 руб. за парковку в запрещённом месте. Срок оплаты — 4 января.', keyPoints: ['Нарушение: Зона запрета остановки (Код 402)', 'Сумма штрафа: 75,00 руб.', 'Срок оплаты: 4 января 2027', 'Неоплата — удвоение штрафа до 150 руб.'] },
    bn: { fileName: 'bn_পার্কিং_জরিমানা.pdf', category: 'legal', summary: 'আপনি নিষিদ্ধ পার্কিং জোনে গাড়ি রাখার জন্য ৭৫ টাকা জরিমানা পেয়েছেন।', keyPoints: ['লঙ্ঘন: নো-স্টপিং জোন (কোড ৪০২)', 'জরিমানার পরিমাণ: ৭৫.০০ টাকা', 'পরিশোধের তারিখ: ৪ জানুয়ারি ২০২৭', 'পরিশোধ না করলে ১৫০ টাকা জরিমানা।'] },
};

const langs = ['en', 'fr', 'de', 'es', 'it', 'pt', 'zh', 'hi', 'ar', 'ru', 'bn'];
const localeMap = { en: 'en-US', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', it: 'it-IT', pt: 'pt-BR', zh: 'zh-CN', hi: 'hi-IN', ar: 'ar-SA', ru: 'ru-RU', bn: 'bn-BD' };

function runCmd(cmd) {
    try { return execSync(cmd, { timeout: 30000 }).toString().trim(); }
    catch (e) { console.error(`Cmd failed: ${cmd}\nError: ${e.message}`); return ''; }
}
function adbRun(args) { return runCmd(`"${adb}" ${args}`); }
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getCdpWsUrl(retries = 10) {
    for (let i = 0; i < retries; i++) {
        try {
            return await new Promise((resolve, reject) => {
                const req = http.get('http://localhost:9223/json', (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            const pages = JSON.parse(data);
                            const page = pages.find(p => p.type === 'page' && p.webSocketDebuggerUrl);
                            if (page) resolve(page.webSocketDebuggerUrl);
                            else reject(new Error('No debuggable page'));
                        } catch (e) { reject(e); }
                    });
                });
                req.on('error', reject);
                req.setTimeout(2000, () => { req.destroy(); reject(new Error('Timeout')); });
            });
        } catch (e) {
            console.log(`  Waiting for CDP... (${i + 1}/${retries})`);
            await sleep(2000);
        }
    }
    throw new Error('Failed to get CDP WS URL after retries');
}

async function evalJS(ws, script) {
    return new Promise((resolve) => {
        const id = Date.now();
        ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression: script, awaitPromise: true } }));
        const handler = (msg) => {
            const data = JSON.parse(msg);
            if (data.id === id) { ws.off('message', handler); resolve(data.result); }
        };
        ws.on('message', handler);
    });
}

async function run() {
    if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
    adbRun('forward --remove-all');

    for (const lang of langs) {
        console.log(`\n=== [${lang}] ===`);

        // Reset App
        adbRun(`shell "pm clear ${pkg}"`);
        await sleep(500);
        adbRun(`shell "settings put global locale ${localeMap[lang]}"`);
        adbRun(`shell "am start -n ${activity}"`);
        await sleep(9000);

        // Connect CDP
        // Dynamically find the abstract socket (it might be webview_devtools_remote_<pid>)
        const devtoolsSocket = adbRun('shell "cat /proc/net/unix | grep webview_devtools_remote"').split('\n')[0].split(' ').pop();
        if (!devtoolsSocket) {
            console.error('  Error: Could not find webview_devtools_remote socket. Is the app open and debuggable?');
            continue;
        }
        console.log(`  Found devtools socket: ${devtoolsSocket}`);

        adbRun(`forward tcp:9223 localabstract:${devtoolsSocket.replace('@', '')}`);
        await sleep(2000);

        let wsUrl;
        try {
            wsUrl = await getCdpWsUrl();
        } catch (e) {
            console.error(`  Error getting CDP URL: ${e.message}`);
            continue;
        }

        const ws = new WebSocket(wsUrl);
        await new Promise((res, rej) => {
            ws.on('open', res);
            ws.on('error', rej);
            setTimeout(() => rej(new Error('WebSocket timeout')), 5000);
        });

        // 1. Inject Language, Premium Mode and Reload
        await evalJS(ws, `localStorage.setItem('documate_lang', '${lang}'); localStorage.setItem('screenshot_premium_mode', 'true');`);
        evalJS(ws, `window.location.reload();`);
        await sleep(6000);

        // Screenshot 1: Home
        console.log('  [1/3] Home...');
        adbRun(`exec-out screencap -p > "screenshots/${lang}_1_home.png"`);

        // 2. Inject Mock Result (this triggers App.tsx logic to show Result screen + localized data)
        const mock = JSON.stringify(mocks[lang]).replace(/`/g, '\\`');
        await evalJS(ws, `localStorage.setItem('screenshot_mock_result', \`${mock}\`);`);
        evalJS(ws, `window.location.reload();`);
        await sleep(6000);

        // Screenshot 2: Result
        console.log('  [2/3] Result...');
        adbRun(`exec-out screencap -p > "screenshots/${lang}_2_result.png"`);

        // 3. Move to History (manual click to be safe)
        adbRun('shell input tap 642 2580');
        await sleep(3000);

        // Screenshot 3: History
        console.log('  [3/3] History...');
        adbRun(`exec-out screencap -p > "screenshots/${lang}_3_history.png"`);

        ws.close();
        adbRun('forward --remove tcp:9223');
    }

    console.log('\nDone! Screenshots generated in screenshots/');
}

run().catch(console.error);
