#!/bin/zsh
# Медиа сайта → объектное хранилище с теми же путями (Яндекс Object Storage; подойдёт любой S3). Пути сохраняются,
# поэтому карта ссылок не нужна: адрес хранилища пишется в docs/media-base.txt, сборка подставляет его во все блоки.
#
#   1) deploy/.s3env (папка deploy/ не в git), заполняет владелец сам:
#        S3_ENDPOINT=https://storage.yandexcloud.net
#        S3_BUCKET=verdant-media
#        AWS_ACCESS_KEY_ID=...        # статический ключ сервисного аккаунта с ролью storage.editor
#        AWS_SECRET_ACCESS_KEY=...
#   2) zsh tools/media-sync.sh            залить docs/site/{media,fonts,js} (только изменившееся), выставить типы и кеш
#      zsh tools/media-sync.sh --check    проверить базовый адрес: код, тип, CORS на кадре и куске видео
#
# Нужен awscli: brew install awscli. Бакет: публичное чтение объектов, CORS: GET/HEAD с любого origin (иначе сцена не нарисует кадры на холсте).
set -e
cd "$(dirname "$0")/.."
[ -f deploy/.s3env ] || { echo "нет deploy/.s3env — заполни по образцу в шапке скрипта"; exit 1; }
set -a; source deploy/.s3env; set +a
: "${S3_ENDPOINT:?}" "${S3_BUCKET:?}" "${AWS_ACCESS_KEY_ID:?}" "${AWS_SECRET_ACCESS_KEY:?}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-ru-central1}"
BASE="${S3_ENDPOINT%/}/${S3_BUCKET}/"
if [[ "$1" == "--check" ]]; then
  for f in media/scene/tall-00.jpg media/scene/flight-tall-1.mp4 fonts/cormorant-garamond-cyrillic-500-italic.woff2 media/loops/t1.mp4; do
    printf '%s → ' "$f"; curl -s -o /dev/null -D - -H 'Origin: https://verdantestate.ru' "${BASE}${f}" | grep -i '^HTTP\|content-type\|access-control-allow-origin\|content-length' | tr '\n' ' '; echo
  done
  exit 0
fi
command -v aws >/dev/null || { echo "нет awscli: brew install awscli"; exit 1; }
sync() { # $1 папка, $2 маска, $3 тип
  aws --endpoint-url "$S3_ENDPOINT" s3 sync "docs/site/$1" "s3://$S3_BUCKET/$1" --exclude '*' --include "$2" --content-type "$3" --cache-control 'public, max-age=31536000, immutable' --acl public-read --size-only
}
sync media '*.jpg'  image/jpeg
sync media '*.webp' image/webp
sync media '*.avif' image/avif
sync media '*.mp4'  video/mp4
sync media '*.json' application/json
sync fonts '*.woff2' font/woff2
sync js    '*.js'   text/javascript
echo "готово: $BASE"
echo "$BASE" > docs/media-base.txt
echo "docs/media-base.txt записан → node tools/build.mjs && node tools/tilda-sheet.mjs"
