# WebPDA — Web Photonic Design Automation

**WebPDA** は、ブラウザ上でシリコンフォトニクス回路の設計を行うことを目指すWebアプリケーションです。既存のWebEDAと同様の操作体系を参考にしながら、独立した光回路設計環境として開発しています。

> **開発状況（2026年11月15日時点）**：React + TypeScript + Viteの初期環境を構築し、ローカル起動・本番ビルド・ESLintの成功を確認しました。PCellエディタや光導波路Routerは**未実装・開発予定**です。GitHubへの初期コードPush完了は未確認です。

## 目標

初期バージョン（Ver.1）では、以下の一連の操作をブラウザで行えるようにすることを目指します。

1. PCellライブラリから光学部品を選んで配置する
2. 部品の形状パラメータを編集する
3. Optical Portの位置・向き・接続状態を表示する
4. Optical Port間を光導波路で接続する
5. レイアウトと接続情報をJSON形式で保存・再読込する

将来的にはPhotonic DRC / LVS、光回路シミュレーション、GDSII出力、KLayoutとの連携も検討します。これらは現時点で利用可能な機能ではありません。

## 開発予定の画面構成

既存WebEDAを参考に、次の画面構成を計画しています。

| 領域 | 役割 |
| --- | --- |
| 上部ナビゲーション | Circuit / Layout / Verify / Export（段階的に実装） |
| 左ペイン | PCell Library |
| 中央ペイン | Photonic Layout Canvas |
| 右ペイン | 選択したPCellのProperties |
| 下部ペイン | 接続・検証メッセージ |

初期のPCell候補はStraight、Bend、Grating Coupler、Directional Couplerなどです。まずStraightとBendの配置から着手します。

## 開発環境

- OS：Linux Mint（開発機：MintRed）
- Node.js：v26.13.1（動作確認時）
- npm：11.20.0（動作確認時）
- nvm：0.40.3（動作確認時）
- フロントエンド：React / TypeScript / Vite
- コード検査：ESLint
- バージョン管理：Git / GitHub（SSH認証）

上記のバージョンは確認時の環境です。すべてが必須の固定バージョンという意味ではありません。

## セットアップと起動

Node.jsとnpmを利用でき、GitHubへのSSH認証が設定されている場合：

```bash
git clone git@github.com:TAKE-HooJoo/webpda.git
cd webpda
npm install
npm run dev
```

ブラウザで **http://localhost:5173/** を開きます。

> 注意：この手順はReact/Viteの初期コードがGitHubにPushされた後に利用できます。リポジトリにREADMEしかない段階では、`npm install` や `npm run dev` は実行できません。

ビルドとLintの確認：

```bash
npm run build
npm run lint
```

## 開発ロードマップ

| 段階 | 内容 | 状況 |
| --- | --- | --- |
| STEP 1 | GitHub SSH連携、React/Vite構築、ローカル起動、ビルド、Lint | ローカル確認済み |
| STEP 2 | 3ペイン画面、Straight/Bend配置、Properties | 未着手 |
| STEP 3 | Optical Portモデル、接続情報 | 未着手 |
| STEP 4 | 光導波路Router（直線・CSCなど） | 未着手 |
| STEP 5 | JSON保存・再読込、検証テスト | 未着手 |
| 将来 | KLayout連携、Photonic DRC/LVS、GDSII、光シミュレーション | 構想段階 |

## 関連プロジェクト

- [WebEDA](https://webeda-ver1.grassyepoch1.chatgpt.site/) — UI設計の参考となる既存ツール
- [klayout-photonics-pdk](https://github.com/TAKE-HooJoo/klayout-photonics-pdk) — KLayoutネイティブのフォトニクス設計環境。将来のデータ形式・PDK定義・Routerの連携を検討

WebPDAはこれらと独立したリポジトリで開発します。連携機能が実装済みという意味ではありません。

## ドキュメント

- [開発環境構築手順書](docs/WebPDA_Development_Setup.md)
- [Ver.1 実装仕様書](docs/WebPDA_Ver1_Spec.md)（リポジトリに追加後に参照可能）

## ライセンス

**未決定**。公開ライセンスは今後決定し、採用時に`LICENSE`ファイルを追加します。

## リポジトリ

[TAKE-HooJoo/webpda](https://github.com/TAKE-HooJoo/webpda)
