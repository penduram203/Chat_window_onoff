// このファイルは SillyTavern の公式拡張機能ローダー（動的 import）経由で読み込まれる前提。
// classic <script> タグでの直接読み込みは行わないこと（export構文が構文エラーになるため）。

const MODULE_NAME = 'chat_window_onoff';
const OLD_STORAGE_KEY = 'chatWindowHiddenState';

/**
 * 公式ギャラリー表示中に非表示にする要素を CSS セレクタで指定する。
 */
const GALLERY_HIDDEN_SELECTORS = [
    // Chat_window_onoff（💡ボタン）
    '#toggle-chat-button',

    // Text_styling 関連：中央 / 右半分ボタン群（親要素を隠せば子も隠れる）
    '#window-control-buttons',

    // 旧推定・候補（存在すれば一緒に隠れる）
    '#restore-panel-button',
    '#text-styling-button',
    '#text-styling-toggle',
    '#toggle-text-styling-button',
    '#text_styling_button',
    '.text-styling-button',
    '.text-styling-toggle',
    '[data-text-styling-toggle]',
];

/**
 * 設定を取得・初期化（旧localStorageからの自動マイグレーションを含む）
 */
function getSettings() {
    const context = SillyTavern.getContext();

    if (!context.extensionSettings[MODULE_NAME]) {
        context.extensionSettings[MODULE_NAME] = {
            isHidden: false,
        };
    }

    const settings = context.extensionSettings[MODULE_NAME];

    try {
        const oldState = localStorage.getItem(OLD_STORAGE_KEY);
        if (oldState !== null) {
            settings.isHidden = (oldState === 'true');
            context.saveSettingsDebounced();
            localStorage.removeItem(OLD_STORAGE_KEY);
            console.log('[Chat Window On/Off] 旧localStorageからextensionSettingsへの移行を完了しました。');
        }
    } catch (e) {
        console.error('[Chat Window On/Off] localStorageからのデータ移行中にエラーが発生しました:', e);
    }

    return settings;
}

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

function initChatWindowToggle() {
    console.log('チャットウィンドウ透過切り替え拡張機能: 初期化開始');

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
    document.addEventListener('DOMContentLoaded', initChatWindowToggle);
} else {
    initChatWindowToggle();
}

/**
 * #chatを画面に固定する（position: fixed）
 */
function applyChatLayout() {
    const chat = document.getElementById('chat');
    const sheld = document.getElementById('sheld');
    const form = document.getElementById('form_sheld');
    if (!chat || !sheld) return;

    if (window.innerWidth < 1001) {
        chat.style.cssText = '';
        if (form) form.style.cssText = '';
        return;
    }

    const sheldRect = sheld.getBoundingClientRect();
    const winW = window.innerWidth;
    const contentWidth = 900;

    const sheldCenterX = sheldRect.left + sheldRect.width / 2;
    const paddingLeft = Math.max(0, sheldCenterX - contentWidth / 2);
    const paddingRight = Math.max(0, winW - sheldCenterX - contentWidth / 2);

    const chatTop = sheldRect.top;
    const chatBottom = window.innerHeight - sheldRect.bottom;

    const formRect = form ? form.getBoundingClientRect() : null;
    const formHeight = formRect ? formRect.height : 40;

    const prevScroll = chat.scrollTop;

    chat.style.position = 'fixed';
    chat.style.left = '0';
    chat.style.right = '0';
    chat.style.top = chatTop + 'px';
    chat.style.bottom = (chatBottom + formHeight) + 'px';
    chat.style.width = '100vw';
    chat.style.maxWidth = '100vw';
    chat.style.margin = '0';
    chat.style.marginLeft = '0';
    chat.style.marginRight = '0';
    chat.style.paddingLeft = paddingLeft + 'px';
    chat.style.paddingRight = paddingRight + 'px';
    chat.style.boxSizing = 'border-box';
    chat.style.overflowY = 'auto';
    chat.style.overflowX = 'hidden';
    chat.style.zIndex = '1';

    if (form) {
        form.style.position = 'fixed';
        form.style.left = '0';
        form.style.right = '0';
        form.style.top = 'auto';
        form.style.bottom = chatBottom + 'px';
        form.style.width = '100vw';
        form.style.maxWidth = '100vw';
        form.style.margin = '0';
        form.style.marginLeft = '0';
        form.style.marginRight = '0';
        form.style.paddingLeft = paddingLeft + 'px';
        form.style.paddingRight = paddingRight + 'px';
        form.style.boxSizing = 'border-box';
        form.style.zIndex = '2';
    }

    chat.scrollTop = prevScroll;
}

setInterval(applyChatLayout, 500);
window.addEventListener('resize', applyChatLayout);

setTimeout(applyChatLayout, 100);

/**
 * #chatのパディング領域（左右の余白）のクリックを背後要素に転送する
 */
function setupChatPaddingClickThrough() {
    const chat = document.getElementById('chat');
    if (!chat) {
        console.log('[Chat Window On/Off] #chat が見つかりません');
        return;
    }

    if (chat.dataset.paddingClickThroughInstalled === 'true') return;
    chat.dataset.paddingClickThroughInstalled = 'true';

    chat.addEventListener('mousedown', (e) => {
        if (e.target !== chat) return;

        const rect = chat.getBoundingClientRect();
        const scrollbarWidth = chat.offsetWidth - chat.clientWidth;
        const isOnScrollbar = scrollbarWidth > 0 && e.clientX >= rect.right - scrollbarWidth;

        if (isOnScrollbar) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        chat.style.pointerEvents = 'none';
        const below = document.elementFromPoint(e.clientX, e.clientY);
        chat.style.pointerEvents = '';

        if (below && below !== chat && !chat.contains(below)) {
            const forwarded = new MouseEvent('mousedown', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: e.clientX,
                clientY: e.clientY,
                button: e.button,
                buttons: e.buttons,
            });
            below.dispatchEvent(forwarded);
        }
    }, true);

    console.log('[Chat Window On/Off] パディング領域のクリック透過を設定しました');
}

setupChatPaddingClickThrough();

// ===================================================================
// ===== ギャラリー連動：公式ギャラリー表示中は対象要素を非表示 =====
// ===================================================================

// ギャラリー開閉判定のキャッシュ（重いDOM読みを毎回呼ばない）
let _galleryOpenCache = { value: false, timestamp: 0 };
const GALLERY_OPEN_CACHE_TTL = 100;

function isGalleryOpen() {
    const now = performance.now();
    if (now - _galleryOpenCache.timestamp < GALLERY_OPEN_CACHE_TTL) {
        return _galleryOpenCache.value;
    }

    let result = false;

    const primary = document.getElementById('gallery');
    if (primary) {
        const style = window.getComputedStyle(primary);
        if (style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            parseFloat(style.opacity) !== 0) {
            const rect = primary.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                result = true;
            }
        }
    }

    if (!result) {
        const candidates = document.querySelectorAll([
            '#gallery_container',
            '.gallery-container',
            '.gallery_container',
            '.gallery',
            '[data-gallery-container]',
            '.gallery-grid',
            '#gallery-grid',
        ].join(','));
        for (const el of candidates) {
            if (!el) continue;
            const style = window.getComputedStyle(el);
            if (style.display === 'none') continue;
            if (style.visibility === 'hidden') continue;
            if (parseFloat(style.opacity) === 0) continue;
            if (el.offsetParent === null && style.position !== 'fixed') continue;
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            result = true;
            break;
        }
    }

    _galleryOpenCache = { value: result, timestamp: now };
    return result;
}

let lastGalleryStateForButtons = null;

function syncButtonsVisibilityForGallery() {
    const galleryOpen = isGalleryOpen();
    if (galleryOpen === lastGalleryStateForButtons) return;
    lastGalleryStateForButtons = galleryOpen;

    const selector = GALLERY_HIDDEN_SELECTORS.join(',');
    const targets = document.querySelectorAll(selector);

    targets.forEach(el => {
        if (galleryOpen) {
            el.style.setProperty('display', 'none', 'important');
        } else {
            el.style.removeProperty('display');
        }
    });

    if (galleryOpen) {
        console.log(`[Chat Window On/Off] 📷 ギャラリー表示中 → ${targets.length} 個の対象要素を非表示`);
    } else {
        console.log(`[Chat Window On/Off] 📷 ギャラリー非表示 → ${targets.length} 個の対象要素を再表示`);
    }
}

function setupGalleryButtonObserver() {
    // MutationObserver は撤去。
    // document.body の style/class 監視は、他拡張（GICなど）の書き込みに
    // 反応してフィードバックループを起こし、メインスレッドを飽和させる。
    // 300ms ポーリングのみで開閉検知には十分。
    setInterval(syncButtonsVisibilityForGallery, 300);
    syncButtonsVisibilityForGallery();
    console.log('[Chat Window On/Off] 📷 ギャラリー連動監視を開始しました（ポーリング方式）');
}

setupGalleryButtonObserver();
