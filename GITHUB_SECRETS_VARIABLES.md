# 🔐 GitHub Secrets va Variables - Qisqa Ro'yxat

Bu fayl GitHub Actions uchun kerakli barcha Secrets va Variables'ning qisqa ro'yxatini o'z ichiga oladi.

## 📍 Qayerda qo'shish

1. GitHub repository'ga o'ting
2. **Settings** → **Secrets and variables** → **Actions**
3. **Secrets** yoki **Variables** tab'ini tanlang
4. **New repository secret/variable** tugmasini bosing

---

## 🔒 SECRETS (Sensitive ma'lumotlar)

Quyidagilarni **Secrets** bo'limiga qo'shing:

| Secret Name | Value | Tavsif |
|------------|-------|--------|
| `BOT_TOKEN` | `8170086825:AAGCScRxnSN28c8q0hnCvA497CApfsUYsqc` | Telegram bot token |
| `JWT_TOKEN_SECRET` | `ok` | JWT token secret key |
| `DB_PASSWORD` | `root123` | PostgreSQL database paroli |
| `SUPER_ADMIN_PASSWORD` | `super_admin123` | Super admin paroli |
| `DEPLOY_HOST` | `ec2-xxx-xxx-xxx-xxx.compute-1.amazonaws.com` | EC2 Public IP yoki DNS |
| `DEPLOY_USER` | `ubuntu` | EC2 foydalanuvchi nomi (Ubuntu uchun `ubuntu`) |
| `DEPLOY_SSH_KEY` | `-----BEGIN RSA PRIVATE KEY-----...` | SSH private key (to'liq) |
| `DEPLOY_PORT` | `22` | SSH port (ixtiyoriy) |

---

## 📝 VARIABLES (Non-sensitive ma'lumotlar)

Quyidagilarni **Variables** bo'limiga qo'shing:

| Variable Name | Value | Tavsif |
|--------------|-------|--------|
| `DB_HOST` | `localhost` | Database host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `postgres` | Database username |
| `DB_DATABASE` | `barbershop_db` | Database nomi |
| `PORT` | `3000` | Application port |
| `JWT_TOKEN_EXPIRATION` | `1y` | JWT token expiration |
| `SUPER_ADMIN_USERNAME` | `super_admin` | Super admin username |
| `SUPER_ADMIN_NAME` | `Super Admin` | Super admin ismi |
| `SUPER_ADMIN_PHONE` | `+998900000000` | Super admin telefon |

---

## ⚠️ Muhim eslatmalar

1. **Production'da** barcha secret va variable'larni production qiymatlariga o'zgartiring
2. **JWT_TOKEN_SECRET** - Production'da kuchliroq key ishlatish tavsiya etiladi
3. **DB_HOST** - Docker Compose'da `db` bo'ladi (container nomi)
4. **DB_PASSWORD** - Production'da xavfsiz parol ishlatish tavsiya etiladi
5. **DEPLOY_SSH_KEY** - SSH key'ni to'liq ko'chirib oling (-----BEGIN dan -----END gacha)
6. **DEPLOY_USER** - Ubuntu uchun `ubuntu` (default)

---

## ✅ Tekshirish

Barcha secret va variable'lar qo'shilgandan so'ng:

1. GitHub Actions'ga o'ting
2. Workflow'ni qo'lda ishga tushiring (Actions → CI/CD Pipeline → Run workflow)
3. Log'larni tekshiring - xatolar bo'lmasligi kerak

---

**Yaratilgan:** GitHub Secrets & Variables Reference
**Versiya:** 1.0.0

