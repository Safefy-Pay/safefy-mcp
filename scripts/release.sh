#!/usr/bin/env bash
# Publica a versão que está no package.json da main: npm, tag vX.Y.Z e release no GitHub.
# Pré-requisito: o bump de versão (npm run release:patch|minor|major) já entrou na main.
set -euo pipefail

cd "$(dirname "$0")/.."

name=$(node -p "require('./package.json').name")
version=$(node -p "require('./package.json').version")
tag="v$version"
repo=$(node -p "require('./package.json').repository.url.replace(/^.*github\.com[:/]/, '').replace(/\.git$/, '')")

fail() { echo "✗ $*" >&2; exit 1; }

command -v gh >/dev/null || fail "gh não encontrado (brew install gh && gh auth login)"
npm whoami >/dev/null 2>&1 || fail "npm sem login (npm login ou NPM_TOKEN no ~/.npmrc)"

[ "$(git rev-parse --abbrev-ref HEAD)" = main ] || fail "rode a partir da branch main"
[ -z "$(git status --porcelain)" ] || fail "há alterações não commitadas"
git fetch -q origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || fail "main local diferente de origin/main (git pull)"
if git ls-remote --exit-code --tags origin "refs/tags/$tag" >/dev/null 2>&1; then fail "tag $tag já existe no GitHub"; fi
# o npm version cria a tag na branch do bump; após o squash ela aponta para outro commit
if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then git tag -d "$tag" >/dev/null; fi
if npm view "$name@$version" version >/dev/null 2>&1; then fail "$name@$version já está no npm"; fi

echo "→ Publicando $name@$version ($repo)"
npm ci
npm run verify
npm publish --access public # prepublishOnly roda typecheck e build

git tag -a "$tag" -m "chore(release): $version"
git push origin "$tag"
gh release create "$tag" --repo "$repo" --title "$tag" --verify-tag --generate-notes

echo "✓ $name@$version publicado, tag $tag e release criadas em $repo"
