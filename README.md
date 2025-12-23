# 💈 Barbershop Bot

Telegram orqali sartaroshxona xizmatlarini bron qilish va boshqarish uchun yaratilgan bot. NestJS, TypeORM, PostgreSQL va Grammy texnologiyalari asosida qurilgan.

## 📋 Tarkib

- [Loyiha haqida](#loyiha-haqida)
- [Xususiyatlar](#xususiyatlar)
- [Texnologiyalar](#texnologiyalar)
- [O'rnatish](#ornatish)
- [Konfiguratsiya](#konfiguratsiya)
- [Ishga tushirish](#ishga-tushirish)
- [CI/CD](#cicd)
- [Foydalanish](#foydalanish)
- [API Dokumentatsiya](#api-dokumentatsiya)
- [Loyiha struktura](#loyiha-struktura)
- [Muammolarni hal qilish](#muammolarni-hal-qilish)

## 🎯 Loyiha haqida

Barbershop Bot - bu mijozlar va sartaroshlar uchun mo'ljallangan Telegram bot. Mijozlar bot orqali sartaroshxona xizmatlarini bron qilishlari, o'z bronlarini ko'rishlari va boshqarishlari mumkin. Sartaroshlar esa o'z smenalarini boshqarishlari, xizmatlarini ko'rsatishlari va bronlarni ko'rishlari mumkin.

## ✨ Xususiyatlar

### Mijozlar uchun:

- ✅ **Ro'yxatdan o'tish** - Telegram orqali tez va oson ro'yxatdan o'tish
- 💈 **Xizmatni bron qilish** - Xizmat turini tanlash, sartaroshni tanlash, sana va vaqtni belgilash
- 📋 **Mening bronlarim** - Barcha bronlarni ko'rish va boshqarish
- ℹ️ **Profil ma'lumotlari** - Shaxsiy ma'lumotlarni ko'rish

### Sartaroshlar uchun:

- ⏱️ **Smena boshqaruvi** - Smenani boshlash va tugatish
- 🛠️ **Xizmatlar boshqaruvi** - O'z xizmatlarini ko'rish va boshqarish
- 📋 **Bronlar ro'yxati** - Barcha bronlarni ko'rish
- ℹ️ **Profil ma'lumotlari** - Shaxsiy ma'lumotlarni ko'rish

### Admin uchun:

- 🔧 **REST API** - Barcha resurslarni boshqarish uchun API
- 📚 **Swagger dokumentatsiya** - To'liq API dokumentatsiyasi

## 🛠️ Texnologiyalar

- **Backend Framework**: NestJS 11.x
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Telegram Bot**: Grammy
- **API Documentation**: Swagger
- **Language**: TypeScript
- **Validation**: class-validator, class-transformer

## 📦 O'rnatish

### Talablar

- Node.js (v18 yoki yuqori)
- PostgreSQL (v12 yoki yuqori)
- npm yoki yarn

### 1-qadam: Loyihani klonlash

```bash
git clone <repository-url>
cd barbershop-bot
```

### 2-qadam: Dependencies o'rnatish

```bash
npm install
```

### 3-qadam: Ma'lumotlar bazasini yaratish

PostgreSQL'da yangi ma'lumotlar bazasini yarating:

```bash
# PostgreSQL terminalida
createdb barbershop_bot

# Yoki psql orqali
psql -U postgres
CREATE DATABASE barbershop_bot;
```

### 4-qadam: Environment o'zgaruvchilarini sozlash

`.env` faylini yarating va quyidagi o'zgaruvchilarni to'ldiring:

```env
# Telegram Bot
BOT_TOKEN=your_bot_token_here
ADMIN_TG_ID=your_telegram_user_id

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=barbershop_bot

# Application
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_TOKEN_SECRET=your_jwt_secret_key_here
JWT_TOKEN_EXPIRATION=7d

# SUPER_ADMIN Configuration (optional - default values will be used if not set)
SUPER_ADMIN_USERNAME=super_admin
SUPER_ADMIN_PASSWORD=super_admin123
SUPER_ADMIN_NAME=Super Admin
SUPER_ADMIN_PHONE=+998900000000
```

**Qayerdan olish kerak:**

- `BOT_TOKEN`: [@BotFather](https://t.me/botfather) dan oling
- `ADMIN_TG_ID`: [@userinfobot](https://t.me/userinfobot) dan oling

**SUPER_ADMIN haqida:**

Loyiha ishga tushganda SUPER_ADMIN avtomatik yaratiladi. Agar `.env` faylida SUPER_ADMIN o'zgaruvchilari belgilanmagan bo'lsa, default qiymatlar ishlatiladi. Xavfsizlik uchun production'da parolni o'zgartirishni tavsiya qilamiz.

## ⚙️ Konfiguratsiya

### Ma'lumotlar bazasi konfiguratsiyasi

Ma'lumotlar bazasi konfiguratsiyasi `src/config/database.config.ts` faylida joylashgan. Development rejimida `synchronize: true` bo'ladi va jadval avtomatik yaratiladi.

### Bot konfiguratsiyasi

Bot konfiguratsiyasi `src/modules/bot/bot.service.ts` faylida joylashgan. Barcha handlerlar va middleware'lar shu yerda sozlanadi.

## 🚀 Ishga tushirish

### Development rejimi

```bash
npm run start:dev
```

Bu buyruq loyihani development rejimida ishga tushiradi va o'zgarishlar avtomatik qayta yuklanadi.

### Production rejimi

```bash
# Build qilish
npm run build

# Production rejimida ishga tushirish
npm run start:prod
```

### Boshqa buyruqlar

```bash
# Format qilish
npm run format

# Lint tekshiruvi
npm run lint

# Testlar
npm run test
```

## 🔄 Database Migration'lar

Loyihada TypeORM migration'lari yordamida database schema boshqariladi. Bu production muhitida xavfsizlik va nazoratni ta'minlaydi.

### Migration buyruqlari

```bash
# Migration'larni ko'rish
npm run migration:show

# Yangi migration yaratish (avtomatik)
npm run migration:generate -- src/database/migrations/MigrationName

# Yangi migration yaratish (manual)
npm run migration:create -- src/database/migrations/MigrationName

# Migration'larni ishga tushirish
npm run migration:run

# Migration'ni bekor qilish (rollback)
npm run migration:revert
```

### Migration'lar bilan ishlash

**Development:**
- `DB_SYNCHRONIZE=true` - Entity'lar avtomatik database'ga yoziladi
- Migration'larni test qilish uchun `DB_SYNCHRONIZE=false` qiling

**Production:**
- `DB_SYNCHRONIZE=false` - Xavfsizlik uchun
- Migration'lar avtomatik ishga tushadi (CI/CD orqali)
- Manual deploy qilsangiz: `docker-compose exec app npm run migration:run`

**Batafsil qo'llanma:** [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)

### Muhim eslatmalar

⚠️ **Production'da:**
- Har doim `DB_SYNCHRONIZE=false` qiling
- Migration'lar orqali database schema'ni o'zgartiring
- Deploy qilishdan oldin migration'larni test qiling

✅ **Best practices:**
- Har bir schema o'zgarishi uchun migration yarating
- Migration'larni git'ga commit qiling
- Migration'larni ishga tushirishdan oldin database backup oling

## 🚀 CI/CD

Loyiha GitHub Actions orqali CI/CD pipeline bilan jihozlangan. Har bir push va pull request'da avtomatik test, lint va build amallari bajariladi. `main` branch'ga push qilinganda avtomatik ravishda EC2 server'ga Docker va Docker Compose orqali deploy qilinadi.

### CI/CD sozlash

Batafsil qo'llanma uchun [CI_CD_SETUP.md](./CI_CD_SETUP.md) faylini ko'rib chiqing.

**Qisqacha:**

1. **GitHub Secrets** qo'shing (Settings → Secrets and variables → Actions → Secrets):
   - `BOT_TOKEN` - Telegram bot token
   - `JWT_TOKEN_SECRET` - JWT secret key
   - `DB_PASSWORD` - Database paroli
   - `SUPER_ADMIN_PASSWORD` - Super admin paroli
   - `DEPLOY_HOST` - EC2 server IP yoki DNS
   - `DEPLOY_USER` - EC2 foydalanuvchi nomi (ubuntu)
   - `DEPLOY_SSH_KEY` - SSH private key

2. **GitHub Variables** qo'shing (Settings → Secrets and variables → Actions → Variables):
   - `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_DATABASE`
   - `PORT`, `JWT_TOKEN_EXPIRATION`
   - `SUPER_ADMIN_USERNAME`, `SUPER_ADMIN_NAME`, `SUPER_ADMIN_PHONE`

3. Workflow avtomatik ishga tushadi va:
   - Kod sifati tekshiruvi (ESLint)
   - Build yaratish
   - Testlar (agar mavjud bo'lsa)
   - EC2'ga Docker va Docker Compose orqali deploy qilish

### Docker

Loyiha Docker va Docker Compose bilan jihozlangan:

```bash
# Local'da ishga tushirish
docker-compose up -d

# Log'larni ko'rish
docker-compose logs -f app

# To'xtatish
docker-compose down
```

## 📱 Foydalanish

### Botni ishga tushirish

1. Telegram'da botingizni toping
2. `/start` buyrug'ini yuboring
3. Agar yangi foydalanuvchi bo'lsangiz, ro'yxatdan o'tish jarayonini yakunlang

### Mijoz sifatida foydalanish

1. **Ro'yxatdan o'tish**:
   - `/start` buyrug'ini yuboring
   - Ismingizni kiriting
   - Telefon raqamingizni yuboring (yoki "Telefon raqamni yuborish" tugmasini bosing)

2. **Xizmatni bron qilish**:
   - "💈 Book Service" tugmasini bosing
   - Xizmat turlarini tanlang (bir nechtasini tanlash mumkin)
   - Sartaroshni tanlang
   - Sanani tanlang
   - Vaqtni tanlang yoki kiriting (HH:mm formatida)

3. **Bronlarni ko'rish**:
   - "📋 My Bookings" tugmasini bosing
   - Barcha bronlaringiz ro'yxati ko'rsatiladi

### Sartarosh sifatida foydalanish

1. **Smena boshqaruvi**:
   - "⏱ Start Shift" - Smenani boshlash
   - "⏹ End Shift" - Smenani tugatish

2. **Xizmatlar**:
   - "🛠 My Services" - O'z xizmatlarini ko'rish

3. **Bronlar**:
   - "📋 My Bookings" - Barcha bronlarni ko'rish

### Dastlabki ma'lumotlarni qo'shish

#### Sartarosh qo'shish (API orqali)

```bash
curl -X POST http://localhost:3000/barbers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "telegram_id": "123456789",
    "barbershop_id": 1
  }'
```

#### Xizmat qo'shish (API orqali)

```bash
curl -X POST http://localhost:3000/barber-services \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Haircut",
    "duration": 30,
    "price": 50000,
    "barber_id": 1
  }'
```

## 📚 API Dokumentatsiya

Loyiha ishga tushgandan so'ng, Swagger API dokumentatsiyasiga quyidagi manzil orqali kirishingiz mumkin:

```
http://localhost:3000/api
```

Bu yerda barcha API endpoint'lari, parametrlar va javoblar haqida to'liq ma'lumot mavjud.

### Asosiy API Endpoint'lar

- **Clients**: `/clients` - Mijozlar boshqaruvi
- **Barbers**: `/barbers` - Sartaroshlar boshqaruvi
- **Barber Services**: `/barber-services` - Xizmatlar boshqaruvi
- **Bookings**: `/bookings` - Bronlar boshqaruvi

## 📁 Loyiha struktura

```
barbershop-bot/
├── src/
│   ├── modules/
│   │   ├── barber/          # Sartarosh moduli
│   │   ├── barber-service/  # Xizmat moduli
│   │   ├── booking/         # Bron moduli
│   │   ├── client/          # Mijoz moduli
│   │   └── bot/             # Telegram bot moduli
│   │       ├── handlers/    # Bot handler'lar
│   │       ├── keyboards/   # Klaviatura sozlamalari
│   │       └── types/       # TypeScript tiplari
│   ├── config/              # Konfiguratsiya fayllari
│   ├── common/              # Umumiy fayllar
│   ├── app.module.ts        # Asosiy modul
│   └── main.ts              # Kirish nuqtasi
├── dist/                    # Build qilingan fayllar
├── package.json
├── tsconfig.json
└── README.md
```

### Modullar tafsiloti

- **Barber Module**: Sartaroshlar CRUD operatsiyalari
- **Barber Service Module**: Xizmatlar CRUD operatsiyalari
- **Booking Module**: Bronlar CRUD operatsiyalari
- **Client Module**: Mijozlar CRUD operatsiyalari
- **Bot Module**: Telegram bot logikasi va handler'lar

## 🔧 Muammolarni hal qilish

### Bot javob bermayapti

- `.env` faylida `BOT_TOKEN` to'g'ri ekanligini tekshiring
- Bot ishlayotganini tekshiring: loglarda "Telegram bot started successfully" xabari bo'lishi kerak
- Bot token'ni [@BotFather](https://t.me/botfather) dan qayta oling

### Ma'lumotlar bazasi xatosi

- PostgreSQL ishlayotganini tekshiring:

  ```bash
  # Windows
  services.msc orqali PostgreSQL xizmatini tekshiring

  # Linux/Mac
  sudo systemctl status postgresql
  ```

- `.env` faylida ma'lumotlar bazasi ma'lumotlarini tekshiring
- `barbershop_bot` ma'lumotlar bazasi mavjudligini tekshiring

### Modul topilmayapti xatosi

```bash
# Dependencies qayta o'rnatish
rm -rf node_modules package-lock.json
npm install
```

### Port allaqachon band

Agar 3000-port band bo'lsa, `.env` faylida `PORT` o'zgaruvchisini o'zgartiring:

```env
PORT=3001
```

### TypeORM synchronize xatosi

Production rejimida `synchronize: false` bo'lishi kerak. Migration'lardan foydalaning.

## 📝 Qo'shimcha ma'lumot

- **SETUP.md**: Tezkor o'rnatish qo'llanmasi
- **MIGRATION_GUIDE.md**: Database migration'lar bo'yicha to'liq qo'llanma
- **CI_CD_SETUP.md**: CI/CD sozlash bo'yicha qo'llanma
- **Swagger API**: `http://localhost:3000/api` - To'liq API dokumentatsiyasi

## 🤝 Yordam

Agar muammo yuzaga kelsa:

1. Loglarni tekshiring
2. Swagger dokumentatsiyasini ko'rib chiqing
3. GitHub Issues'da muammoni bildiring

## 📄 Litsenziya

Bu loyiha shaxsiy loyiha sifatida yaratilgan.

---

**Yaratilgan**: NestJS va Grammy texnologiyalari bilan
**Versiya**: 0.0.1
