# 🔄 Migration Guide

TypeORM migration'lari bilan database schema'ni boshqarish bo'yicha to'liq qo'llanma.

## 📋 Mundarija

- [Migration nima?](#migration-nima)
- [Asosiy buyruqlar](#asosiy-buyruqlar)
- [Migration yaratish](#migration-yaratish)
- [Migration'larni ishga tushirish](#migrationlarni-ishga-tushirish)
- [Rollback qilish](#rollback-qilish)
- [Best Practices](#best-practices)
- [Production'da ishlash](#productionda-ishlash)

## Migration nima?

Migration - bu database schema'dagi o'zgarishlarni versiyalash va boshqarish uchun fayllar. Ular:
- Database strukturasini nazorat qiladi
- O'zgarishlar tarixini saqlaydi
- Rollback imkoniyatini beradi
- Team development uchun qulay

## Asosiy buyruqlar

### Migration'larni ko'rish

```bash
npm run migration:show
```

Bu buyruq barcha migration'lar va ularning holatini ko'rsatadi.

### Yangi migration yaratish

#### Avtomatik (mavjud entity'lardan)

```bash
npm run migration:generate -- src/database/migrations/MigrationName
```

TypeORM entity'lar bilan database'ni solishtiradi va farqlarni migration qilib yaratadi.

#### Manual (bo'sh migration)

```bash
npm run migration:create -- src/database/migrations/MigrationName
```

Bo'sh migration fayli yaratadi, siz o'zingiz yozasiz.

### Migration'larni ishga tushirish

```bash
npm run migration:run
```

Barcha pending migration'larni tartib bilan ishga tushiradi.

### Migration'ni bekor qilish (rollback)

```bash
npm run migration:revert
```

Oxirgi ishga tushirilgan migration'ni bekor qiladi.

## Migration yaratish

### 1. Entity o'zgartirgandan keyin

Entity'ni o'zgartiring:

```typescript
// src/modules/user/entities/user.entity.ts
@Entity('users')
export class User {
  // ... mavjud fieldlar
  
  @Column({ nullable: true })
  bio?: string; // Yangi field qo'shdik
}
```

Migration yarating:

```bash
npm run migration:generate -- src/database/migrations/AddBioToUsers
```

### 2. Manual migration yaratish

Murakkab o'zgarishlar uchun manual migration yozing:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBioToUsers1234567890000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN "bio" varchar NULL
    `);
    
    // Default qiymat qo'yish
    await queryRunner.query(`
      UPDATE "users" 
      SET "bio" = 'No bio yet' 
      WHERE "bio" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN "bio"
    `);
  }
}
```

## Migration'larni ishga tushirish

### Development

```bash
# Development'da entity'lar avtomatik synchronize bo'ladi
# Lekin migration'larni test qilish uchun:

# 1. .env faylida synchronize'ni o'chiring
DB_SYNCHRONIZE=false

# 2. Migration'larni ishga tushiring
npm run migration:run

# 3. Natijani tekshiring
npm run migration:show
```

### Production

Production'da migration'lar avtomatik ishga tushadi (CI/CD orqali):

1. Code push qilasiz (migration bilan)
2. CI/CD build qiladi
3. Deploy paytida migration avtomatik ishga tushadi
4. Application ishga tushadi

Manual ishga tushirish kerak bo'lsa:

```bash
# Docker container ichida
docker-compose exec app npm run migration:run
```

## Rollback qilish

### Bir migration'ni bekor qilish

```bash
npm run migration:revert
```

Bu oxirgi migration'ni bekor qiladi.

### Bir nechta migration'ni bekor qilish

```bash
# Birinchi migration'ni bekor qiling
npm run migration:revert

# Ikkinchi migration'ni bekor qiling
npm run migration:revert

# Va hokazo...
```

### Production'da rollback

```bash
# 1. Container ichida rollback qiling
docker-compose exec app npm run migration:revert

# 2. Application'ni restart qiling
docker-compose restart app

# 3. Tekshiring
docker-compose exec app npm run migration:show
```

## Best Practices

### ✅ Qilish kerak

1. **Har bir o'zgarish uchun alohida migration yarating**
   ```bash
   # Yaxshi
   AddEmailToUsers
   AddPhoneToUsers
   
   # Yomon
   AddMultipleFieldsToUsers
   ```

2. **Migration'larni test qiling**
   ```bash
   # Up va down ikkisini ham test qiling
   npm run migration:run
   npm run migration:revert
   npm run migration:run
   ```

3. **To'g'ri nomlash**
   ```bash
   # Yaxshi nomlar
   CreateUsersTable
   AddIndexToBookings
   RemoveOldFieldFromServices
   
   # Yomon nomlar
   Update
   Fix
   Change
   ```

4. **Har doim down() metodini yozing**
   ```typescript
   public async down(queryRunner: QueryRunner): Promise<void> {
     // Up()'ning teskari operatsiyasini bajaring
   }
   ```

### ❌ Qilmaslik kerak

1. **Migration'ni o'zgartirmang** (ishga tushgandan keyin)
   - Yangi migration yarating o'rniga

2. **Production'da synchronize=true ishlatmang**
   - Xavfli, nazorat yo'q

3. **Migration'siz entity o'zgartirmang** (production'da)
   - Har doim migration yarating

4. **Migration fayllarini o'chirmang**
   - Tarix yo'qoladi

## Production'da ishlash

### Database backup olish

Migration'dan oldin backup oling:

```bash
# PostgreSQL backup
docker-compose exec db pg_dump -U postgres barbershop_db > backup.sql

# Agar muammo bo'lsa, restore qiling
docker-compose exec -T db psql -U postgres barbershop_db < backup.sql
```

### Zero-downtime deployment

1. **Backward compatible migration'lar yozing**
   ```typescript
   // Yaxshi: Yangi field nullable
   @Column({ nullable: true })
   newField?: string;
   
   // Yomon: Nullable bo'lmagan field (old code ishlamaydi)
   @Column()
   newField: string;
   ```

2. **Ikki bosqichli deployment**
   - Bosqich 1: Nullable field qo'shing
   - Bosqich 2: Default qiymat qo'ying va nullable'ni olib tashlang

### Migration monitoring

```bash
# Migration statusini tekshirish
docker-compose exec app npm run migration:show

# Application loglarini ko'rish
docker-compose logs -f app

# Database loglarini ko'rish
docker-compose logs -f db
```

## Maslahatlar

### Migration'larni tezroq yozish

TypeScript snippet yarating (VSCode):

```json
{
  "TypeORM Migration": {
    "prefix": "migration",
    "body": [
      "import { MigrationInterface, QueryRunner } from 'typeorm';",
      "",
      "export class ${1:MigrationName}${2:1234567890000} implements MigrationInterface {",
      "  public async up(queryRunner: QueryRunner): Promise<void> {",
      "    $3",
      "  }",
      "",
      "  public async down(queryRunner: QueryRunner): Promise<void> {",
      "    $4",
      "  }",
      "}"
    ]
  }
}
```

### Migration test qilish

Local'da test qiling:

```bash
# 1. Test database yarating
createdb barbershop_test

# 2. Test database'ga migration'lar ishga tushiring
DB_DATABASE=barbershop_test npm run migration:run

# 3. Rollback test qiling
DB_DATABASE=barbershop_test npm run migration:revert

# 4. Test database'ni o'chiring
dropdb barbershop_test
```

## Muammo hal qilish

### Migration ishlamayapti

```bash
# 1. TypeORM config'ni tekshiring
cat src/config/typeorm.config.ts

# 2. Database connection'ni tekshiring
docker-compose exec app npm run migration:show

# 3. Migration fayllarini tekshiring
ls -la src/database/migrations/
```

### Migration'lar qayta ishga tushmoqda

```bash
# Migration jadvalni tekshiring
docker-compose exec db psql -U postgres barbershop_db -c "SELECT * FROM migrations;"

# Agar muammo bo'lsa, jadvalni tozalang (FAQAT development'da!)
docker-compose exec db psql -U postgres barbershop_db -c "DELETE FROM migrations WHERE name = 'MigrationName';"
```

### Production'da migration xato berdi

```bash
# 1. Loglarni tekshiring
docker-compose logs --tail=100 app

# 2. Database state'ni tekshiring
docker-compose exec db psql -U postgres barbershop_db

# 3. Rollback qiling
docker-compose exec app npm run migration:revert

# 4. Code'ni to'g'rilab, qayta deploy qiling
```

## Qo'shimcha resurslar

- [TypeORM Migration Documentation](https://typeorm.io/migrations)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- Loyiha README.md fayli

---

**Eslatma**: Migration'lar database schema'ni boshqarish uchun juda muhim. Ehtiyotkorlik bilan ishlang, ayniqsa production'da!

