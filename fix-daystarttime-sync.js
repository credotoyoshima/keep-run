// ローカルストレージとデータベースの同期を修正するスクリプト
// ブラウザのコンソールで実行してください

// 1. 現在のローカルストレージの値を確認
console.log('現在のローカルストレージの値:', localStorage.getItem('dayStartTime'));

// 2. ローカルストレージをクリア
localStorage.removeItem('dayStartTime');
console.log('ローカルストレージをクリアしました');

// 3. ページをリロードして、データベースから最新の値を取得
console.log('ページをリロードしてください...');
// location.reload();