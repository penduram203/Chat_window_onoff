// このファイルは SillyTavern の公式拡張機能ローダー（動的 import）経由で読み込まれる前提。
// classic <script> タグでの直接読み込みは行わないこと（export構文が構文エラーになるため）。

const MODULE_NAME = 'chat_window_onoff';
const OLD_STORAGE_KEY = 'chatWindowHiddenState';

/**
 * 設定を取得・初期化（旧localStorageからの自動マイグレーションを含む）
 */
function getSettings() {
    const context = SillyTavern.getContext();

    // extensionSettings 内に自拡張機能用の空間を確保
    if (!context.extensionSettings[MODULE_NAME]) {
        context.extensionSettings[MODULE_NAME] = {
            isHidden: false,
        };
    }

    const settings = context.extensionSettings[MODULE_NAME];

    // 旧 localStorage からの自動マイグレーション処理
    try {
        const oldState = localStorage.getItem(OLD_STORAGE_KEY);
        if (oldState !== null) {
            settings.isHidden = (oldState === 'true');
            context.saveSettingsDebounced();
            localStorage.removeItem(OLD_STORAGE_KEY); // 移行完了後に旧データを消去
            console.log('[Chat Window On/Off] 旧localStorageからextensionSettingsへの移行を完了しました。');
        }
    } catch (e) {
        console.error('[Chat Window On/Off] localStorageからのデータ移行中にエラーが発生しました:', e);
    }

    return settings;
}

/**
 * 設定をサーバー側へ保存
 */
function saveSettings(settings) {
    try {
        const context = SillyTavern.getContext();
        context.extensionSettings[MODULE_NAME] = settings;
        context.saveSettingsDebounced();
    } catch (e) {
        console.error('[Chat Window On/Off] 設定の保存に失敗しました:', e);
    }
}

export async function onInstall() {
    console.log('[Chat Window On/Off] onInstall フックが呼び出されました。初回セットアップを行います。');
    try {
        getSettings();
    } catch (e) {
        console.error('[Chat Window On/Off] onInstall中の初期化に失敗しました:', e);
    }
    if (typeof toastr !== 'undefined') {
        toastr.success('Chat Window On/Off 拡張機能がインストールされました。');
    }
}

// 公式ローダーはこのファイルを動的 import() で読み込む。
// import() が解決される時点で document.body は既に確実に存在するため、
// DOMContentLoaded を待つ必要はない ―― むしろ、待つと二度と発火せず
// 初期化が永久に走らなくなる（このイベントは通常ページ読み込み時に
// 一度きり発火しており、拡張機能の動的読み込みはそれより後になるため）。
// 念のため readyState が 'loading' の場合だけイベントを待つ防御的な実装にする。
function initChatWindowToggle() {
    console.log('チャットウィンドウ透過切り替え拡張機能: 初期化開始');

    // 既にボタンが存在する場合は多重生成しない（再読み込み・多重importの保険）
    if (document.getElementById('toggle-chat-button')) {
        return;
    }

    const settings = getSettings();

    const toggleButton = document.createElement('button');
    toggleButton.id = 'toggle-chat-button';
    toggleButton.textContent = '💡';
    toggleButton.title = 'チャットウィンドウの透過/不透過';
    document.body.appendChild(toggleButton);
    console.log('💡 アイコンボタンをDOMに追加しました。');

    // 保存された状態の復元・反映
    if (settings.isHidden) {
        document.body.classList.add('chat-window-is-hidden');
        toggleButton.classList.add('active');
        console.log('保存された状態（透過）を復元しました。');
    }

    toggleButton.addEventListener('click', () => {
        document.body.classList.toggle('chat-window-is-hidden');
        const isHidden = document.body.classList.contains('chat-window-is-hidden');
        toggleButton.classList.toggle('active', isHidden);

        settings.isHidden = isHidden;
        saveSettings(settings);
        console.log(`チャットウィンドウの状態を保存: ${isHidden ? '透過' : '不透過'}`);
    });
}

if (document.readyState === 'loading') {
    // 理論上ここに入ることはまず無いが、念のため保険として残す
    document.addEventListener('DOMContentLoaded', initChatWindowToggle);
} else {
    initChatWindowToggle();
}

/**
 * #chatを画面に固定する（position: fixed）
 * - 左右は画面いっぱいに広げ、内側パディングでコンテンツを中央寄せ
 * - 上下は #sheld のヘッダ下 / フォーム上に合わせる
 * - ウィンドウリサイズやDOM変化に追従するため、定期的に再計算
 */
/**
 * #chatを画面に固定する（position: fixed）
 * - 左右は画面いっぱいに広げ、内側パディングでコンテンツを中央寄せ
 * - 上下は #sheld の領域に合わせる（formRectの複雑な判定は行わない）
 */
function applyChatLayout() {
    const chat = document.getElementById('chat');
    const sheld = document.getElementById('sheld');
    const form = document.getElementById('form_sheld');
    if (!chat || !sheld) return;

    // モバイル幅では元のレイアウトに戻す
    if (window.innerWidth < 1001) {
        chat.style.cssText = '';
        if (form) form.style.cssText = '';
        return;
    }

    const sheldRect = sheld.getBoundingClientRect();
    const contentWidth = 900;

    // #sheld の領域を基準に上下端を計算
    const chatTop = sheldRect.top;
    const chatBottom = window.innerHeight - sheldRect.bottom;

    // フォームの高さを取得（チャット領域から差し引く）
    const formRect = form ? form.getBoundingClientRect() : null;
    const formHeight = formRect ? formRect.height : 40;

    // ---- #chat を固定 ----
    chat.style.position = 'fixed';
    chat.style.left = '0';
    chat.style.right = '0';
    chat.style.top = chatTop + 'px';
    // フォーム分を空けて、下端がフォームに被らないようにする
    chat.style.bottom = (chatBottom + formHeight) + 'px';
    chat.style.width = 'auto';
    chat.style.maxWidth = 'none';
    chat.style.margin = '0';
    chat.style.paddingLeft = `calc((100vw - ${contentWidth}px) / 2)`;
    chat.style.paddingRight = `calc((100vw - ${contentWidth}px) / 2)`;
    chat.style.boxSizing = 'border-box';
    chat.style.overflowY = 'auto';
    chat.style.overflowX = 'hidden';
    chat.style.zIndex = '1';

    // ---- #form_sheld も固定（#sheld の下端に配置） ----
    if (form) {
        form.style.position = 'fixed';
        form.style.left = '0';
        form.style.right = '0';
        form.style.top = 'auto';
        form.style.bottom = chatBottom + 'px';
        form.style.width = 'auto';
        form.style.maxWidth = 'none';
        form.style.margin = '0';
        form.style.paddingLeft = `calc((100vw - ${contentWidth}px) / 2)`;
        form.style.paddingRight = `calc((100vw - ${contentWidth}px) / 2)`;
        form.style.boxSizing = 'border-box';
        form.style.zIndex = '2';
    }
}

// 定期的にレイアウトを更新（#sheld が動いても追従）
setInterval(applyChatLayout, 1000);
window.addEventListener('resize', applyChatLayout);

// 初期化後に一度実行
setTimeout(applyChatLayout, 100);

// 定期的にレイアウトを更新（ウィンドウ操作ボタンで #sheld が動いても追従）
setInterval(applyChatLayout, 1000);
window.addEventListener('resize', applyChatLayout);

// 初期化後に一度実行
setTimeout(applyChatLayout, 100);
