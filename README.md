# 概要

複数の Google アカウントでカレンダーを管理する際に、複数のカレンダー間で予定を同期するための GAS。
基本的に GAS が分かる人向け。

# 公式ドキュメント

https://developers.google.com/apps-script/advanced/calendar

# 基本概念

- あらかじめ指定した複数のカレンダーのうちどれかに予定が入った際に、その他のカレンダーにその時間をブロックする予定を作成する。
- その実際に入った予定のことを OriginalEvent と呼び、ブロックする予定のことを BlockEvent と呼ぶ。
  - （ちなみに Google カレンダー API で使われる Event とは予定一個一個のこと）
  - ブロックイベントは非公開設定。
- 予定が削除されたとき、予定を辞退したときはブロックイベントを削除する。
  - ブロックイベントの方を手動で消しても問題は起きないようにできてる。
  - もし不具合でオリジナルイベントが消えたのにブロックイベントが消えていなかったら手動で消してください。
- 環境ごとに変更する変数は variables.js に記載されている。
- 全てのカレンダーに対して書き込み権限のある Google アカウントの GAS にデプロイする。
  - 全てのアカウントに対して書き込み権限が持てない場合は、複数のアカウントにデプロイする必要がある。
- 一応手動でテストしてるけど、完璧じゃないと思う。
  - 明らかに不具合と分かる挙動があったら教えてください。
- 繰り返しの予定に関しては、GAS の Calendar API が対応していないので対応できません。
  - 繰り返しの予定を入れた場合、1個目だけブロックイベントが入り、2個目以降はブロックイベントを生成しません。

# デプロイ方法

[clasp](https://github.com/google/clasp) コマンドが必要。
`$ npm install -g @google/clasp` でインストール。

- シェアするカレンダー同士は、互いに「予定の変更」以上の権限を持つように設定する。
- 全アカウント分のトリガーを作成するので、デプロイは一つでOK。

## なんとなく自動

1. このレポジトリをクローンする。
2. `$ bin/configure` を叩く。
  - 初回はデプロイするアカウントでログイン。
3. 生成される `src/variables.js` の `calendars` の id と email を埋める。カレンダーの id はカレンダーの設定画面から確認できる。
4.  `$ npm run push` してスクリプトを更新。
5.  `$ SCRIPT_ID=xxx ./bin/open_web_editor` で該当のスクリプトのページを開き、左のメニューの「サービス」の + を押し、Google Calendar API を選択。v3でのみ動作確認済み。
6.  ブラウザ上の右上の「デプロイ > 新しいデプロイ」を選択。
7. 種類を「ウェブアプリ」にしてデプロイ。
8. トリガータブの中でシェアするカレンダー全てのトリガーを作成。

## 手動

1.  このレポジトリをクローンする。
2.  https://script.google.com にアクセスし、デプロイするGoogleアカウントでログイン。
3.  「新しいプロジェクト」ボタンを押し、URL の中のスクリプトIDをコピー。
4.  `$ cp .clasp.template.json .clasp.json` して、 `scriptId` の部分にスクリプトIDをペースト。
5.  `$ cp src/variables.template.js src/variables.js` して、 `calendars` の id と email を埋める。カレンダーの id はカレンダーの設定画面から確認できる。
6.  `$ clasp login` して、デプロイするGoogleアカウントでログイン。
7.  `$ npm run push` してスクリプトを更新。
5.  `$ SCRIPT_ID=xxx ./bin/open_web_editor` で該当のスクリプトのページを開き、左のメニューの「サービス」の + を押し、Google Calendar API を選択。v3でのみ動作確認済み。
9.  ブラウザ上の右上の「デプロイ > 新しいデプロイ」を選択。
10. 種類を「ウェブアプリ」にしてデプロイ。
11. トリガータブの中でシェアするカレンダー全てのトリガーを作成。

# 修正方法

## コードの修正

1. このレポジトリのコードを任意のエディタで修正。
2. `$ npm run push`で GAS サーバにコードをプッシュ。
3. デバッグ。
4. OK であれば git でコミット & プッシュ。

`.clasp.json`の`scriptId`にて GAS プロジェクトを指定する。

## GAS の Web コンソールで修正した場合

1. `$ npm run pull`でコードを取得。
2. git でコミット & プッシュ。

# ファイル構成

- 実際の GAS コードは`src/`配下に置く。
- GAS には`import`がなく、全てのファイルが同じスコープで定義される。そのためファイルごとの読み込み順序が重要。読み込み順序は`.clasp.json`で管理する。

# その他

## GAS の ScriptProperties の容量制限

https://developers.google.com/apps-script/guides/services/quotas#current_limitations

- 一個の最大サイズ: 9kB
- トータルの最大サイズ: 500kB

多めに見積もってキーバリュー1ペアにつき 200 バイトだとすると、 `500,000 / 200 = 2,500` 個までOK。

## TypeScript

デフォルトで対応しているようだが、この程度のコード量であれば無い方がシンプルで良いと判断し導入していない。

## 参考

骨子は https://qiita.com/howdy39/items/b92c9ba0b050151a889b から頂きました、ありがとうございます！
