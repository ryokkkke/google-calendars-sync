// 予定を同期するカレンダーのIDを指定。
// ここで指定されたカレンダーのどれかに予定が作成/削除されたとき、それ以外のカレンダー全てに同じ時間帯の予定を作成/削除する。
// （全てに書き込み権限のあるアカウントでデプロイする必要がある）
// -- idとemailを分けているのは、idがメアドとは限らないから（デフォルトカレンダーのidはメアドになるが、その他のカレンダーはランダムな文字列になる）
const calendars = [
  // {
  //   id: "your-address@gmail.com",
  //   email: "your-address@gmail.com"
  // },
  // {
  //   id: "...",
  //   email: "..."
  // },
  // ...
];

// 参加ステータスのうち、どの段階でブロックイベントを作成するか
const attendingResponses = ["accepted", "tentative"];

// ブロックイベントのタイトル
const blockEventSummaryPrefix = "ブロック by ";
const generateBlockEventSummary = (updatedCalendarId) => `${blockEventSummaryPrefix}${updatedCalendarId}`;

// オリジナルイベントとブロックイベントの紐付きデータをScriptPropertiesに保存しているが、容量制限があるはずなので一定数たまったら古いものを削除する
// 古いオリジナル予定が削除されたときにブロック予定が削除されないことになるが、古い予定に関してはそうなっても良いと判断
// -- 1日に入る予定数を決め、nヶ月分は保存しておく。
const eventsPerDay = 20;
const limitMonth = 2;
const limitDays = limitMonth * 30;
const storedBlockEventsLimit = eventsPerDay * limitDays;
// -- n週間より前の予定を削除
const deleteThresholdWeeks = 2;
const deleteThresholdMilliSecond = deleteThresholdWeeks * 7 * 24 * 60 * 60 * 1000;
