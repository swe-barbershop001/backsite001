# 🚀 CI/CD Setup Qo'llanmasi

Bu qo'llanma GitHub Actions orqali CI/CD pipeline'ni sozlash uchun yordam beradi.

## 📋 Tarkib

- [GitHub Secrets va Variables sozlash](#github-secrets-va-variables-sozlash)
- [Workflow tushuntirish](#workflow-tushuntirish)
- [Deployment sozlash](#deployment-sozlash)

## 🔐 GitHub Secrets va Variables sozlash

### GitHub Secrets (Sensitive ma'lumotlar)

GitHub repository'da **Settings → Secrets and variables → Actions → Secrets** bo'limiga o'ting va quyidagi secret'larni qo'shing:

#### 1. **BOT_TOKEN**
```
8170086825:AAGCScRxnSN28c8q0hnCvA497CApfsUYsqc
```
**Tavsif:** Telegram bot token'i (BotFather dan olingan)

#### 2. **JWT_TOKEN_SECRET**
```
ok
```
**Tavsif:** JWT token'lar uchun secret key (production'da kuchliroq key ishlatish tavsiya etiladi)

#### 3. **DB_PASSWORD**
```
root123
```
**Tavsif:** PostgreSQL database paroli

#### 4. **SUPER_ADMIN_PASSWORD**
```
super_admin123
```
**Tavsif:** Super admin foydalanuvchisi paroli

---

### GitHub Variables (Non-sensitive ma'lumotlar)

GitHub repository'da **Settings → Secrets and variables → Actions → Variables** bo'limiga o'ting va quyidagi variable'larni qo'shing:

#### 1. **DB_HOST**
```
localhost
```
**Tavsif:** Database host manzili (production'da o'zgartiring)

#### 2. **DB_PORT**
```
5432
```
**Tavsif:** PostgreSQL port

#### 3. **DB_USERNAME**
```
postgres
```
**Tavsif:** Database foydalanuvchi nomi

#### 4. **DB_DATABASE**
```
barbershop_db
```
**Tavsif:** Database nomi

#### 5. **PORT**
```
3000
```
**Tavsif:** Application port

#### 6. **JWT_TOKEN_EXPIRATION**
```
1y
```
**Tavsif:** JWT token amal qilish muddati

#### 7. **SUPER_ADMIN_USERNAME**
```
super_admin
```
**Tavsif:** Super admin username

#### 8. **SUPER_ADMIN_NAME**
```
Super Admin
```
**Tavsif:** Super admin to'liq ismi

#### 9. **SUPER_ADMIN_PHONE**
```
+998900000000
```
**Tavsif:** Super admin telefon raqami

---

## 🔄 Workflow tushuntirish

### CI Job (Continuous Integration)

Har bir push va pull request'da quyidagi amallar bajariladi:

1. **Code Checkout** - Kodni repository'dan oladi
2. **Node.js Setup** - Node.js 20.x versiyasini o'rnatadi
3. **Dependencies Install** - `npm ci` orqali dependencies o'rnatadi
4. **ESLint** - Kod sifati tekshiruvi
5. **Build** - Production build yaratadi
6. **Tests** - Testlar ishga tushadi (agar mavjud bo'lsa)

### CD Job (Continuous Deployment)

Faqat `main` branch'ga push qilinganda ishga tushadi:

1. **Build** - Production build yaratadi
2. **Environment Setup** - `.env` faylini GitHub Secrets va Variables'dan yaratadi
3. **Package Creation** - Deployment uchun package yaratadi
4. **Artifact Upload** - Deployment package'ni artifact sifatida saqlaydi

---

## 🚀 Deployment sozlash

Workflow avtomatik ravishda EC2 server'ga Docker va Docker Compose orqali deploy qiladi.

### EC2 Server sozlash

#### 1. EC2 Instance yaratish

1. AWS Console'ga kiring
2. EC2 → Launch Instance
3. **Ubuntu Server** tanlang (22.04 LTS yoki yangiroq)
4. Instance type tanlang (t2.micro yoki kattaroq)
5. Key pair yarating yoki mavjudini tanlang
6. Security Group'da quyidagi portlarni oching:
   - **22** (SSH)
   - **3000** (Application)
   - **5432** (PostgreSQL - faqat ichki trafik uchun)

#### 2. SSH Key sozlash

EC2 instance'ga ulanish uchun SSH key'ni GitHub Secrets'ga qo'shing:

```bash
# SSH key'ni ko'rish
cat ~/.ssh/your-key.pem

# Yoki yangi key yaratish
ssh-keygen -t rsa -b 4096 -C "github-actions"
```

**Muhim:** SSH key'ni to'liq ko'chirib oling (-----BEGIN RSA PRIVATE KEY----- dan -----END RSA PRIVATE KEY----- gacha)

#### 3. GitHub Secrets qo'shish

**Settings → Secrets and variables → Actions → Secrets** bo'limiga quyidagilarni qo'shing:

| Secret Name | Value | Tavsif |
|------------|-------|--------|
| `DEPLOY_HOST` | `ec2-xxx-xxx-xxx-xxx.compute-1.amazonaws.com` | EC2 Public IP yoki DNS |
| `DEPLOY_USER` | `ubuntu` | EC2 foydalanuvchi nomi (Ubuntu uchun `ubuntu`, Amazon Linux uchun `ec2-user`) |
| `DEPLOY_SSH_KEY` | `-----BEGIN RSA PRIVATE KEY-----...` | SSH private key (to'liq) |
| `DEPLOY_PORT` | `22` | SSH port (ixtiyoriy, default: 22) |

#### 4. Docker va Docker Compose

Workflow avtomatik ravishda Docker va Docker Compose'ni o'rnatadi. Agar qo'lda o'rnatmoqchi bo'lsangiz:

**Ubuntu (Tavsiya etiladi):**
```bash
# Docker o'rnatish
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu

# Logout va login qiling (yoki yangi session oching)
```

**Amazon Linux 2023 (Alternativ):**
```bash
# Docker o'rnatish
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Docker Compose o'rnatish
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose
```

### Deployment jarayoni

Workflow quyidagi amallarni bajaradi:

1. **Docker va Docker Compose o'rnatish** - Agar o'rnatilmagan bo'lsa
2. **Kodni server'ga yuklash** - SCP orqali
3. **.env faylini yaratish** - GitHub Secrets va Variables'dan
4. **Docker image build qilish** - `docker-compose build`
5. **Container'larni ishga tushirish** - `docker-compose up -d`

### Deployment keyin tekshirish

```bash
# SSH orqali server'ga ulaning
ssh -i your-key.pem ubuntu@your-ec2-ip

# Container'larni ko'rish
cd /home/ubuntu/barbershop-bot
docker-compose ps

# Log'larni ko'rish
docker-compose logs -f app

# Application'ni tekshirish
curl http://localhost:3000/api
```

### Qo'shimcha deployment variantlari

Agar boshqa deployment method ishlatmoqchi bo'lsangiz:

#### Docker Registry orqali

```yaml
- name: 🐳 Build Docker image
  run: |
    docker build -t barbershop-bot:${{ github.sha }} .
    docker tag barbershop-bot:${{ github.sha }} barbershop-bot:latest

- name: 📤 Push to Docker Registry
  run: |
    echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u "${{ secrets.DOCKER_USERNAME }}" --password-stdin
    docker push barbershop-bot:${{ github.sha }}
    docker push barbershop-bot:latest
```

#### Cloud Platform (AWS ECS, GCP, Azure)

Har bir platform uchun o'ziga xos action'lar mavjud:
- **AWS ECS**: `aws-actions/amazon-ecs-deploy-task-definition`
- **GCP Cloud Run**: `google-github-actions/deploy-cloudrun`
- **Azure Container Instances**: `azure/aci-deploy`

---

## 📝 Qo'shimcha sozlamalar

### Environment variables tekshiruvi

Workflow ishga tushganda, barcha kerakli environment variable'lar mavjudligini tekshirish uchun validation qo'shishingiz mumkin:

```yaml
- name: ✅ Validate environment variables
  run: |
    if [ -z "${{ secrets.BOT_TOKEN }}" ]; then
      echo "❌ BOT_TOKEN is missing!"
      exit 1
    fi
    echo "✅ All required secrets are set"
```

### Database migration

Agar migration'lardan foydalanmoqchi bo'lsangiz:

```yaml
- name: 🗄️ Run database migrations
  run: npm run migration:run
  env:
    DB_HOST: ${{ vars.DB_HOST }}
    DB_PORT: ${{ vars.DB_PORT }}
    DB_USERNAME: ${{ vars.DB_USERNAME }}
    DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
    DB_DATABASE: ${{ vars.DB_DATABASE }}
```

---

## 🔍 Troubleshooting

### Workflow ishlamayapti

1. **Secrets va Variables tekshiring** - Barcha kerakli secret va variable'lar qo'shilganligini tekshiring
2. **Permissions tekshiring** - GitHub Actions'ga kerakli permission'lar berilganligini tekshiring
3. **Log'larni ko'ring** - GitHub Actions'da workflow log'larini tekshiring

### Build xatosi

1. **Node.js versiyasi** - `package.json` va workflow'dagi Node.js versiyalari mos kelishini tekshiring
2. **Dependencies** - Barcha dependencies to'g'ri o'rnatilganligini tekshiring
3. **TypeScript config** - `tsconfig.json` sozlamalarini tekshiring

### Deployment xatosi

1. **SSH connection** - SSH key va host ma'lumotlarini tekshiring
2. **Server sozlamalari** - Server'da Node.js, PM2 va boshqa kerakli tool'lar o'rnatilganligini tekshiring
3. **Database connection** - Production database'ga ulanishni tekshiring

---

## 📚 Qo'shimcha resurslar

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [NestJS Deployment](https://docs.nestjs.com/recipes/deployment)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)

---

## ✅ Checklist

Deployment'ni sozlashdan oldin quyidagilarni tekshiring:

- [ ] Barcha GitHub Secrets qo'shilgan
- [ ] Barcha GitHub Variables qo'shilgan
- [ ] Workflow fayli to'g'ri sozlangan
- [ ] Deployment method tanlangan va sozlangan
- [ ] Server sozlamalari tayyor
- [ ] Database production'da tayyor
- [ ] Domain va SSL sertifikat (agar kerak bo'lsa)

---

**Yaratilgan:** CI/CD Pipeline Setup
**Versiya:** 1.0.0

