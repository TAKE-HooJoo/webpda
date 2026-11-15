# WebPDA Ver.1 開発環境構築手順書

- 作成日: 2026-11-15
- 対象: Linux Mint（MintRed）、GitHub `TAKE-HooJoo/webpda`
- 範囲: WebPDA STEP 1（開発環境の構築と動作確認）
- 状態: **ローカル起動、ビルド、Lintは確認済み。GitHubへの初期コードPushは未確認。**

## 1. 目的と開発方針

既存WebEDAと同じUI構成を持つ独立したシリコンフォトニクス向けWebアプリ **WebPDA（Web Photonic Design Automation）** を開発する。初期実装はPCell配置、Optical Port、光導波路Routerを中心とするエディタとし、後続工程でKLayout Photonic Design Environmentとの連携を目指す。

- フロントエンド: React + TypeScript + Vite
- バージョン管理: Git / GitHub（SSH）
- ローカル作業ディレクトリ: `~/webpda`
- リポジトリ: https://github.com/TAKE-HooJoo/webpda

## 2. GitHubリポジトリのClone

最初はHTTPSでCloneを試みた。

```bash
cd ~
git clone https://github.com/TAKE-HooJoo/webpda.git
```

GitHubのユーザー名とパスワードを入力したが、次のエラーが発生した。

```text
remote: Invalid username or token. Password authentication is not supported for Git operations.
fatal: Authentication failed
```

**原因:** GitHubのGit操作ではアカウントのパスワード認証がサポートされない。既存のSSH認証を利用する方針に変更した。

```bash
ssh -T git@github.com
```

実際の確認結果:

```text
Hi TAKE-HooJoo! You've successfully authenticated, but GitHub does not provide shell access.
```

SSHキーは既に利用可能だったため、新規作成・再登録は不要だった。

```bash
cd ~
git clone git@github.com:TAKE-HooJoo/webpda.git
cd webpda
git remote -v
git status
```

確認結果:

```text
origin  git@github.com:TAKE-HooJoo/webpda.git (fetch)
origin  git@github.com:TAKE-HooJoo/webpda.git (push)
ブランチ main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
```

Clone直後は `.git/` と `README.md` が存在した。

## 3. Node.js・npm・nvmの導入

初回確認では `node` と `npm` が見つからなかった。Linux Mint標準のapt版ではなく、Node.jsのバージョンを管理できるnvmを利用した。

実施した手順として案内したコマンド:

```bash
sudo apt update
sudo apt install -y curl ca-certificates
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.bashrc
nvm install --lts
nvm alias default 'lts/*'
```

※ 上記の各インストールコマンドの個別ログは未取得。ただし、導入後のバージョン確認は成功した。

```bash
node --version
npm --version
nvm --version
```

確認結果:

```text
v26.13.1
11.20.0
0.40.3
```

## 4. React + TypeScript + Viteの初期化

```bash
cd ~/webpda
npm create vite@latest . -- --template react-ts
```

実際の対話画面では `create-vite v9.3.4` と表示された。既存の `README.md` を残すため、ディレクトリが空でないという質問には **Ignore files and continue** を選択。リンター選択画面では **ESLint** を案内した。

**注意:** `create-vite` のバージョンと実際の開発サーバーのViteバージョンは異なる。後述の起動ログでは **Vite v8.3.8** を確認した。

依存パッケージのインストール（初期化時に自動実行されていない場合）:

```bash
npm install
```

## 5. 開発サーバーの起動とブラウザ確認

```bash
cd ~/webpda
npm run dev
```

確認できた表示:

```text
VITE v8.3.8 ready in 205 ms
Local: http://localhost:5173/
```

Chromeで `http://localhost:5173/` を開き、React/Viteの初期画面（Get started、Count is 0など）が表示されることを確認した。これは **開発サーバーと初期React画面の動作確認** であり、WebPDA独自画面はまだ実装していない。

停止するときは開発サーバーを実行しているターミナルで `Ctrl+C` を押す。

## 6. ビルドと静的解析

```bash
cd ~/webpda
npm run build
npm run lint
```

実際のビルドログから確認できた内容:

```text
> webpda@0.0.0 build
> tsc -b && vite build
vite v8.3.8 building client environment for production...
20 modules transformed.
✓ built in 149ms

> webpda@0.0.0 lint
> eslint .
```

エラーなくシェルプロンプトに戻ったため、**TypeScriptビルド、Viteビルド、ESLintの実行成功を確認**した。

## 7. GitHubへの初期コード登録（未確認）

次のコマンドは案内済みだが、実行結果はまだ確認していない。Push前に必ず状態を確認する。

```bash
cd ~/webpda
git status
git add .
git commit -m "Initialize WebPDA React TypeScript Vite project"
git push origin main
```

`nothing to commit` が表示された場合は新規コミット不要。Push成功後にGitHubのリポジトリ画面で `src/`、`package.json` 等が登録されているか確認する。

## 8. トラブルシューティング

| 現象 | 原因・対応 |
|---|---|
| HTTPS Cloneでパスワード認証失敗 | GitHubパスワード認証非対応。既存のSSH URLを利用 |
| `cd webpda` が失敗 | 直前のCloneが失敗し、ディレクトリが作成されていなかった |
| `node` / `npm` が見つからない | nvmでNode.jsを導入し、シェルを再読込 |
| Vite初期化時にディレクトリが空でない | READMEを残すため `Ignore files and continue` を選択 |
| `create-vite v9.3.4` と `Vite v8.3.8` が違う | 前者はプロジェクト生成ツール、後者は実行中のビルドツール |

## 9. STEP 2への引き継ぎ

**確認済み:** GitHub SSH認証、SSH Clone、Node.js/npm/nvm、Vite初期画面表示、TypeScript/Viteビルド、ESLint。

**未確認:** 初期コードの `git push origin main` 成功。

次の実装対象:

1. WebEDAと同様の上部ナビゲーションと3ペイン画面
2. PCell Library（Straight、Bend）
3. SVG Layout Canvas（選択・配置・移動）
4. Properties Panel（幅、長さ、曲率半径）
5. Optical Port表示とJSON保存

初期コードをGitHubに保存し、`main` がクリーンであることを確認してからSTEP 2に進む。
