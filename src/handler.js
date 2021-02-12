const scriptProperties = PropertiesService.getScriptProperties();
const nextSyncTokenKeyPrefix = 'NEXT_SYNC_TOKEN_';
const blockEventIdKeyPrefix = "BLOCK_EVENT_ID_BY_";
const generateBlockEventIdKey = (originalEventId) => `${blockEventIdKeyPrefix}${originalEventId}`;

const onUpdateCalendar = (updateEvent) => {
  const updatedCalendarId = updateEvent.calendarId;
  const originalEventGuestCalendar = calendars.find((calendar) => calendar.id === updatedCalendarId);
  if (originalEventGuestCalendar == undefined) return console.log("this update event is not a target.");
  
  const targetCalendars = calendars.filter((calendar) => calendar.id !== updatedCalendarId);
  if (targetCalendars.length === 0) return console.log("no target calendars.");
  
  // 変更のあった予定を取得
  const nextSyncToken = new NextSyncToken(updatedCalendarId);
  const option = { syncToken: nextSyncToken.get() };
  const events = Calendar.Events.list(updatedCalendarId, option);
  
  try {
    // 予定ごとに処理
    events.items.forEach((item)=> {
      const updatedCalendarEvent = new UpdatedCalendarEvent(originalEventGuestCalendar.email, item);
      
      // 終日の予定は無視
      if (updatedCalendarEvent.isAllDay) {
        console.log("ignoring an all day event.");
        return;
      }

      targetCalendars.forEach((calendar) => {
        const calendarId = calendar.id;
        const targetCalendar = CalendarApp.getCalendarById(calendarId);

        // 同じ時間帯のブロック予定を削除
        // -- 予定が削除された場合
        // -- 「参加：いいえ」の場合
        if (updatedCalendarEvent.isDeleted || updatedCalendarEvent.isDeclined) {
          // 削除した予定がブロックイベントの場合は何もしない
          // オリジナル予定との紐付けデータはゴミデータになるが許容する（値からキーを検索する処理を追加すると煩雑になるので）
          if (updatedCalendarEvent.isBlockEvent) return console.log("the deleted event was a block event.");

          const blockEvent = updatedCalendarEvent.getBlockEventFromCalendar(targetCalendar);
          if (blockEvent == undefined) return;

          blockEvent.delete();
          return;
        }

        // 同じ時間帯にブロック予定を作成
        // -- 参加でなければ終了
        if (!updatedCalendarEvent.isAttend) return;
        // -- 既にブロックイベントが存在する場合は作成しない
        const blockEvent = updatedCalendarEvent.getBlockEventFromCalendar(targetCalendar);
        if (blockEvent && blockEvent.exists()) return;

        // ブロックイベントの作成
        const summary = generateBlockEventSummary(updatedCalendarId);
        const createdBlockEvent = updatedCalendarEvent.createBlockEvent(targetCalendar, summary);

        // オリジナル予定のIDとブロック予定のIDを紐づける
        createdBlockEvent.register();
        console.log(`created a block event on ${item.start.dateTime} - ${item.end.dateTime}`);
      });
    });
  } finally {
    // エラーで処理し損なったとしても、今回処理したイベントを次の発火時に対象外とするためsyncTokenを更新
    nextSyncToken.update(events.nextSyncToken);
  }
}
