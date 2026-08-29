# Reinvention Avoidance Layer (RAL)

GPLv3 の自由を減らさず、「役に立つ改変は、できれば共有してほしい」という要請を fork の先まで残し、その要請に応えるコストを `ral publish` で小さくするプロジェクトです。

このリポジトリには、MVP の3要素が含まれます。

- [`REINVENTION_NOTICE`](./REINVENTION_NOTICE): GPLv3 の上に置く短い正式文
- [`site/`](./site/): Reinvention Avoidance Layer の静的説明ページ
- [`packages/ral/`](./packages/ral/): 公開 GitHub fork へ改変を push するCLI

## ローカルで確認する

Node.js 20 以降が必要です。外部パッケージのインストールは不要です。

```sh
npm run check
npm run dev
```

表示された URL を開くと説明サイトを確認できます。

## CLIを試す

```sh
npm install --global ./packages/ral
ral publish --dry-run
```

実際の公開には Git と [GitHub CLI](https://cli.github.com/) の認証が必要です。`ral publish` は公開 fork に branch を作成しますが、upstream Pull Request は作成しません。

## 文書

思想、導入方法、先行例との違いは [`REINVENTION.md`](./REINVENTION.md) を参照してください。

## License

コードとサイトは GNU GPLv3 の下で提供されます。`REINVENTION_NOTICE` の非拘束的な共有要請と保持条項も参照してください。

これは法的助言ではありません。
