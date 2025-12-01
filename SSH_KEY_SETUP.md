# 🔐 SSH Key Setup - To'liq Qo'llanma

Bu qo'llanma GitHub Actions orqali EC2'ga deploy qilish uchun SSH key'ni to'g'ri sozlash haqida batafsil ma'lumot beradi.

## 📋 Tarkib

- [SSH Key turlari](#ssh-key-turlari)
- [SSH Key yaratish](#ssh-key-yaratish)
- [EC2'da SSH Key sozlash](#ec2da-ssh-key-sozlash)
- [GitHub Secrets'ga qo'shish](#github-secretsga-qoshish)
- [Tekshirish](#tekshirish)
- [Muammolarni hal qilish](#muammolarni-hal-qilish)

---

## 🔑 SSH Key turlari

### 1. **RSA Key (Eski, lekin keng qo'llaniladi)**
```bash
ssh-keygen -t rsa -b 4096 -C "github-actions"
```

### 2. **ED25519 Key (Yangi, tavsiya etiladi)**
```bash
ssh-keygen -t ed25519 -C "github-actions"
```

### 3. **EC2 Key Pair (AWS orqali yaratilgan)**
- AWS Console → EC2 → Key Pairs → Create key pair
- Format: `.pem` (OpenSSH format)

---

## 🔨 SSH Key yaratish

### Variant 1: AWS Key Pair ishlatish (Tavsiya etiladi - EC2 uchun)

Agar AWS orqali EC2 instance yaratgan bo'lsangiz, key pair avtomatik yaratilgan:

```bash
# 1. AWS'dan yuklab olingan .pem faylini ko'rish
cat ~/.ssh/your-key.pem

# Yoki Downloads papkasida bo'lsa:
cat ~/Downloads/your-key.pem

# 2. Key format'ini tekshirish
head -1 ~/.ssh/your-key.pem
# Natija: -----BEGIN RSA PRIVATE KEY----- bo'lishi kerak

tail -1 ~/.ssh/your-key.pem
# Natija: -----END RSA PRIVATE KEY----- bo'lishi kerak

# 3. Key'ni to'g'ri joyga ko'chirish (ixtiyoriy)
mv ~/Downloads/your-key.pem ~/.ssh/your-key.pem
chmod 400 ~/.ssh/your-key.pem
```

**Muhim:** AWS Key Pair yaratilganda, public key avtomatik ravishda EC2 instance'ga qo'shiladi. Faqat private key'ni GitHub Secrets'ga qo'shishingiz kerak!

### Variant 2: Yangi SSH Key yaratish

Agar AWS Key Pair ishlatmoqchi bo'lmasangiz:

```bash
# 1. SSH key yaratish
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy

# Yoki RSA bilan:
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy

# 2. Private key'ni ko'rish (GitHub Secrets'ga qo'shish uchun)
cat ~/.ssh/github_actions_deploy

# 3. Public key'ni ko'rish (EC2'ga qo'shish uchun)
cat ~/.ssh/github_actions_deploy.pub
```

---

## 🖥️ EC2'da SSH Key sozlash

### 1-qadam: EC2 Instance yaratish

1. AWS Console → EC2 → Launch Instance
2. **Ubuntu Server 22.04 LTS** tanlang
3. Key pair yarating yoki mavjudini tanlang
4. Security Group'da portlarni oching:
   - **22** (SSH) - Source: `0.0.0.0/0` yoki GitHub Actions IP range
   - **3000** (Application)
   - **5432** (PostgreSQL - faqat ichki trafik)

### 2-qadam: Public Key'ni EC2'ga qo'shish

#### Variant A: AWS Key Pair ishlatgan bo'lsangiz (Tavsiya etiladi)

**Muhim:** AWS Key Pair yaratilganda, public key avtomatik ravishda EC2 instance'ga qo'shiladi! Hech qanday qo'shimcha sozlash kerak emas.

Faqat tekshirish:

```bash
# EC2'ga ulaning
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip

# Public key mavjudligini tekshiring
cat ~/.ssh/authorized_keys
# Bu yerda sizning public key'ingiz ko'rinishi kerak
```

Agar ulanish ishlamasa, quyidagilarni tekshiring:

```bash
# File permissions'ni tekshiring
ls -la ~/.ssh/
# .ssh/ 700 bo'lishi kerak
# authorized_keys 600 bo'lishi kerak

# Agar kerak bo'lsa, to'g'rilang
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

#### Variant B: Yangi key yaratgan bo'lsangiz

```bash
# Local'da public key'ni ko'ring
cat ~/.ssh/github_actions_deploy.pub

# EC2'ga SSH orqali ulaning (AWS key pair bilan)
ssh -i ~/.ssh/your-aws-key.pem ubuntu@your-ec2-ip

# EC2'da authorized_keys fayliga qo'shing
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

### 3-qadam: SSH sozlamalarini tekshirish

```bash
# EC2'ga ulaning
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip

# SSH sozlamalarini tekshiring
sudo cat /etc/ssh/sshd_config | grep -E "PubkeyAuthentication|AuthorizedKeysFile"

# Agar kerak bo'lsa, sozlang:
# PubkeyAuthentication yes
# AuthorizedKeysFile .ssh/authorized_keys
```

---

## 🔒 GitHub Secrets'ga qo'shish

### 1. Private Key'ni ko'rish

```bash
# Yangi key yaratgan bo'lsangiz
cat ~/.ssh/github_actions_deploy

# Yoki EC2 key pair ishlatgan bo'lsangiz
cat ~/.ssh/your-key.pem
```

### 2. GitHub Secrets'ga qo'shish

1. GitHub repository'ga o'ting
2. **Settings** → **Secrets and variables** → **Actions** → **Secrets**
3. **New repository secret** tugmasini bosing
4. Quyidagilarni qo'shing:

#### `DEPLOY_SSH_KEY` (AWS Key Pair uchun)

**Muhim:** AWS Key Pair (.pem fayl) to'liq ko'chirib oling!

**AWS Key Pair format:**

```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdef
...
(many lines of base64 encoded data)
...
-----END RSA PRIVATE KEY-----
```

**Qanday ko'chirish (AWS Key Pair):**

1. Terminal'da key'ni ko'ring:
   ```bash
   # Agar Downloads papkasida bo'lsa
   cat ~/Downloads/your-key.pem
   
   # Yoki .ssh papkasida bo'lsa
   cat ~/.ssh/your-key.pem
   ```

2. **Barcha qatorlarni** ko'chiring (bo'sh qatorlar ham):
   - `-----BEGIN RSA PRIVATE KEY-----` dan boshlanadi
   - `-----END RSA PRIVATE KEY-----` bilan tugaydi
   - Barcha oraliq qatorlar ham (odatda 20-30 qator)

3. GitHub Secrets'ga yopishtiring:
   - Name: `DEPLOY_SSH_KEY`
   - Value: Key'ni yopishtiring

4. Key'ning boshida va oxirida qo'shimcha bo'shliq bo'lmasligi kerak

**Tekshirish:**

```bash
# Key'ning boshida tekshirish
head -1 ~/.ssh/your-key.pem
# Natija: -----BEGIN RSA PRIVATE KEY----- bo'lishi kerak

# Key'ning oxirida tekshirish
tail -1 ~/.ssh/your-key.pem
# Natija: -----END RSA PRIVATE KEY----- bo'lishi kerak

# Key uzunligini tekshirish
wc -l ~/.ssh/your-key.pem
# Natija: kamida 20-30 qator bo'lishi kerak
```

#### `DEPLOY_HOST`

```
ec2-54-123-45-67.compute-1.amazonaws.com
```

Yoki:

```
54.123.45.67
```

#### `DEPLOY_USER`

Ubuntu uchun:
```
ubuntu
```

#### `DEPLOY_PORT` (ixtiyoriy)

```
22
```

---

## ✅ Tekshirish

### 1. Local'da tekshirish

```bash
# SSH key bilan EC2'ga ulanish
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip

# Agar muvaffaqiyatli ulansa, key to'g'ri sozlangan
```

### 2. GitHub Actions'da tekshirish

Workflow ishga tushganda, SSH connection muvaffaqiyatli bo'lishi kerak.

---

## 🔍 Muammolarni hal qilish

### Muammo 1: "ssh: handshake failed: ssh: unable to authenticate"

**Sabablari:**

1. **SSH key format noto'g'ri**
   - Key to'liq ko'chirilmagan
   - Bo'sh qatorlar qo'shilmagan
   - Key'ning boshida/oxirida qo'shimcha bo'shliq bor

2. **EC2'da public key qo'shilmagan**
   - `~/.ssh/authorized_keys` faylida public key yo'q
   - File permissions noto'g'ri

3. **SSH sozlamalari noto'g'ri**
   - `PubkeyAuthentication` o'chirilgan
   - `AuthorizedKeysFile` noto'g'ri sozlangan

**Yechim:**

```bash
# 1. Key format'ini tekshiring
cat ~/.ssh/your-key.pem | head -1
cat ~/.ssh/your-key.pem | tail -1

# 2. EC2'ga boshqa usul bilan ulaning va tekshiring
ssh -i ~/.ssh/your-ec2-key.pem ubuntu@your-ec2-ip

# 3. authorized_keys faylini tekshiring
cat ~/.ssh/authorized_keys

# 4. File permissions'ni tekshiring
ls -la ~/.ssh/
# .ssh/ 700 bo'lishi kerak
# authorized_keys 600 bo'lishi kerak

# 5. SSH sozlamalarini tekshiring
sudo cat /etc/ssh/sshd_config | grep PubkeyAuthentication
# PubkeyAuthentication yes bo'lishi kerak
```

### Muammo 2: "Permission denied (publickey)"

**Sabab:** Public key EC2'da qo'shilmagan yoki noto'g'ri qo'shilgan

**Yechim:**

```bash
# EC2'ga ulaning
ssh -i ~/.ssh/your-ec2-key.pem ubuntu@your-ec2-ip

# Public key'ni qo'shing
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

### Muammo 3: "Connection refused"

**Sabab:** Security Group'da port 22 ochilmagan

**Yechim:**

1. AWS Console → EC2 → Security Groups
2. Security Group'ni tanlang
3. Inbound rules → Edit
4. Port 22 (SSH) qo'shing
5. Source: `0.0.0.0/0` yoki GitHub Actions IP range

### Muammo 4: Key GitHub Secrets'da saqlanmayapti

**Sabab:** Key juda uzun yoki format noto'g'ri

**Yechim:**

1. Key'ni qayta ko'chiring
2. Barcha qatorlarni ko'chiring
3. GitHub Secrets'da "Add secret" tugmasini bosing
4. Key'ni yopishtiring

---

## 📝 Key format misollari

### RSA Private Key (EC2 .pem format)

```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890abcdef...
(many lines of base64 encoded data)
...
-----END RSA PRIVATE KEY-----
```

### OpenSSH Private Key (Yangi format)

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAACFwAAAAdzc2gtcn
...
(many lines)
...
-----END OPENSSH PRIVATE KEY-----
```

---

## ⚠️ Xavfsizlik eslatmalari

1. **Private key'ni hech qachon public repository'ga qo'ymang**
2. **Key'ni faqat GitHub Secrets'da saqlang**
3. **Key'ni boshqalar bilan baham ko'rmang**
4. **Agar key buzilgan bo'lsa, yangi key yarating va eskisini o'chiring**

---

## ✅ Checklist

Deployment'ni sozlashdan oldin:

- [ ] SSH key yaratilgan (yoki EC2 key pair mavjud)
- [ ] Public key EC2'da `~/.ssh/authorized_keys` fayliga qo'shilgan
- [ ] File permissions to'g'ri (`.ssh` 700, `authorized_keys` 600)
- [ ] Private key GitHub Secrets'ga to'liq qo'shilgan
- [ ] `DEPLOY_HOST` to'g'ri (EC2 Public IP yoki DNS)
- [ ] `DEPLOY_USER` to'g'ri (`ubuntu`)
- [ ] Security Group'da port 22 ochiq
- [ ] Local'da SSH connection ishlayapti

---

**Yaratilgan:** SSH Key Setup Guide
**Versiya:** 1.0.0

