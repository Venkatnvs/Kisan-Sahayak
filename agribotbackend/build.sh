set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py makemigrations
python manage.py migrate
python manage.py cleanup_unused_media --no-input
# python manage.py createsuperuser --noinput