# Reinvention Avoidance Layer (RAL)

Reinvention Avoidance Layer (RAL) は、GNU GPLv3 の自由を減らさずに、再利用可能な改変の共有を促すための小さな規範と公開支援ツールです。新しいソフトウェアライセンスではありません。

## 二つを分ける

この仕組みは、次の二つを意図的に分離します。

1. **共有の要請は非拘束的です。** GPLv3 は、改変物を他者へ伝達しない限り、そのソースコードの公開を要求しません。RAL もこの自由を狭めません。
2. **Notice の保持だけを求めます。** `REINVENTION_NOTICE` は、GPLv3 §7(b) に基づく「specified reasonable legal notice」として、対象物を伝達するときに保持することを求めます。保持されることで、非拘束的な要請が fork の先にも届きます。

共有しなくても、GPLv3 によって与えられた権利は失われません。Notice の保持義務と、その中に記された共有のお願いを混同しないことが重要です。

## なぜ法的義務にしないのか

内部利用や私的利用にまで公開義務を広げるライセンスは、採用、互換性、機密情報、個人情報、セキュリティ対応などに新しい負担を生みます。一方で、役に立つ改変がローカルに眠り、別の人が同じ問題を解き直す損失も現実にあります。

RAL は、その緊張をライセンス条件の追加ではなく、持続する要請と公開コストを下げる道具で扱います。

## 先行する考え方

- **PortAudio** は、ライセンス本文と区別したうえで、改変を原開発者へ送り、非拘束的な要請も一緒に残すよう求めています。RAL が最も直接に参考にした先例です。
- **RPL 1.5** は、一定の deployment に達した改変のソース公開を法的条件として設計しました。
- **APSL 2.0** も、Externally Deploy した改変についてソース提供を求めます。

RPL や APSL が義務の射程を広げたのに対し、RAL は GPLv3 を置き換えず、公開を依頼に留めます。

一次資料:

- [GNU GPLv3 §7](https://www.gnu.org/licenses/gpl-3.0.html#section7)
- [PortAudio LICENSE.txt](https://github.com/PortAudio/portaudio/blob/master/LICENSE.txt)
- [Reciprocal Public License 1.5](https://opensource.org/license/RPL-1.5)
- [Apple Public Source License 2.0](https://opensource.apple.com/apsl/)

## 導入方法

GPLv3 を採用するリポジトリのルートに、次を置きます。

```text
LICENSE
REINVENTION_NOTICE
REINVENTION.md       # 任意
```

- `LICENSE` は GNU GPLv3 の全文です。
- `REINVENTION_NOTICE` は短い正式文です。採用時に意味を変える編集はせず、そのまま置くことを推奨します。
- `REINVENTION.md` は背景と実務を説明する任意文書です。

GPLv3 §7 の追加条項は、対象となる素材について権限を持つ著作権者が追加する必要があります。既存プロジェクトへ導入するときは、プロジェクトの権利関係と合意形成を確認してください。

## 公開する

開発版 CLI をインストールします。

```sh
npm install --global ./packages/ral
ral publish
```

`ral publish` は、現在の commit を自分の公開 GitHub fork の `ral/...` branch へ push し、共有 URL を返します。upstream への Pull Request は作りません。

エージェントや自動化から使う場合も、外部公開はデータ送信です。ユーザーの明示的な承認なしに実行しないでください。`--yes` は内容を確認済みの場合にだけ使います。

## 法的注意

このプロジェクトは一般的な情報とテンプレートを提供するもので、個別の法的助言ではありません。導入先、法域、権利関係によって判断が変わり得ます。
