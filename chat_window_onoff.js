// このファイルは SillyTavern の公式拡張機能ローダー（動的 import）経由で読み込まれる前提。
// classic <script> タグでの直接読み込みは行わないこと（export構文が構文エラーになるため）。

export async function onInstall() {
    console.log('[Chat Window On/Off] onInstall フックが呼び出されました。初回セットアップを行います。');

    const STORAGE_KEY = 'chatWindowHiddenState';
    try {
        if (localStorage.getItem(STORAGE_KEY) === null) {
            localStorage.setItem(STORAGE_KEY, 'false');
            console.log('[Chat Window On/Off] 初期状態（非透過）を設定しました。');
        }
    } catch (e) {
        console.error('[Chat Window On/Off] onInstall中の初期化に失敗しました:', e);
    }

    if (typeof toastr !== 'undefined') {
        toastr.success('Chat Window On/Off 拡張機能がインストールされました。');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('チャットウィンドウ透過切り替え拡張機能: 初期化開始');

    const STORAGE_KEY = 'chatWindowHiddenState';

    setTimeout(() => {
        const toggleButton = document.createElement('button');
        toggleButton.id = 'toggle-chat-button';
        toggleButton.textContent = '💡';
        toggleButton.title = 'チャットウィンドウの透過/不透過';
        document.body.appendChild(toggleButton);
        console.log('💡 アイコンボタンをDOMに追加しました。');

        toggleButton.addEventListener('click', () => {
            document.body.classList.toggle('chat-window-is-hidden');

            const isHidden = document.body.classList.contains('chat-window-is-hidden');
            toggleButton.classList.toggle('active', isHidden);

            try {
                localStorage.setItem(STORAGE_KEY, isHidden);
                console.log(`チャットウィンドウの状態を保存: ${isHidden ? '透過' : '不透過'}`);
            } catch (e) {
                console.error('localStorageへの保存に失敗しました:', e);
            }
        });

        try {
            const savedState = localStorage.getItem(STORAGE_KEY);
            if (savedState === 'true') {
                document.body.classList.add('chat-window-is-hidden');
                toggleButton.classList.add('active');
                console.log('保存された状態（透過）を復元しました。');
            }
        } catch (e) {
            console.error('localStorageからの状態復元に失敗しました:', e);
        }

    }, 500);
});
