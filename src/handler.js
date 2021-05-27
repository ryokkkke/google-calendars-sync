const scriptProperties = PropertiesService.getScriptProperties();

const onUpdateCalendarHandler = (updateEvent) => {
  const updatedCalendarId = updateEvent.calendarId;
  const originalEventGuestCalendar = calendarPropertiesList.find((calendarProperties) => calendarProperties.id === updatedCalendarId);
  if (originalEventGuestCalendar == undefined) return console.log("this update event is not a target.");
  
  const targetCalendarPropertiesList = calendarPropertiesList.filter((calendarProperties) => calendarProperties.id !== updatedCalendarId);
  if (targetCalendarPropertiesList.length === 0) return console.log("no target calendars.");

  // 変更のあった予定を取得
  const nextSyncToken = new NextSyncToken(updatedCalendarId);
  const option = { syncToken: nextSyncToken.get() };
  const events = Calendar.Events.list(updatedCalendarId, option);
  
  try {
    // 予定ごとに処理
    events.items.forEach((item)=> {
      const updatedCalendarEvent = new UpdatedCalendarEvent(originalEventGuestCalendar.email, item);
      
      // 終日の予定は無視
      if (updatedCalendarEvent.isAllDay) return console.log("ignoring an all day event.");

      targetCalendarPropertiesList.forEach((targetCalendarProperties) => {
        // 同じ時間帯のブロック予定を削除
        // -- 予定が削除された場合
        // -- 「参加：いいえ」の場合
        if (updatedCalendarEvent.isDeleted || updatedCalendarEvent.isDeclined) {
          // 削除した予定がブロックイベントの場合は何もしない
          // オリジナル予定との紐付けデータはゴミデータになるが許容する（値からキーを検索する処理を追加すると煩雑になるので）
          if (updatedCalendarEvent.isBlockEvent) return console.log("the deleted event was a block event.");

          const targetCalendar = CalendarApp.getCalendarById(targetCalendarProperties.id);
          const blockEvent = updatedCalendarEvent.fetchBlockEventFromCalendar(targetCalendar);
          if (blockEvent == undefined) return;

          blockEvent.delete();
          return;
        }

        // 同じ時間帯にブロック予定を作成
        // -- 参加でなければ終了
        if (!updatedCalendarEvent.isAttend) return console.log("this is not an event which is planned to attend.");
        // -- 既にブロックイベントが存在する場合は作成しない
        const targetCalendar = CalendarApp.getCalendarById(targetCalendarProperties.id);
        const blockEvent = updatedCalendarEvent.fetchBlockEventFromCalendar(targetCalendar);
        if (blockEvent != undefined) {
          if (updatedCalendarEvent.isSameTime(blockEvent)) return console.log("a block event already exists.");

          // 時間が変更されている場合はブロックイベントの時間を変更する
          blockEvent.updateTime(updatedCalendarEvent.startTime, updatedCalendarEvent.endTime);
          return console.log("updated the block event startTime and endTime.");
        }

        // ブロックイベントの作成
        const summary = generateBlockEventSummary(updatedCalendarId);
        updatedCalendarEvent.createBlockEvent(targetCalendar, summary);
        console.log(`created a block event.`);
      });
    });
  } finally {
    // エラーで処理し損なったとしても、今回処理したイベントを次の発火時に対象外とするためsyncTokenを更新
    nextSyncToken.update(events.nextSyncToken);
  }
}
