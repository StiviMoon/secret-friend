# 🚀 Guía de Despliegue en Vercel

## ✅ Plan Gratuito de Vercel (Hobby)

**Sí, puedes desplegar completamente gratis** con el plan Hobby de Vercel que incluye:

- ✅ **Deployments ilimitados**
- ✅ **100GB de ancho de banda por mes**
- ✅ **SSL automático** (HTTPS)
- ✅ **Dominio personalizado** (opcional)
- ✅ **Builds automáticos** desde GitHub/GitLab
- ✅ **Preview deployments** para cada PR
- ✅ **Analytics básico** (ya incluido con @vercel/analytics)

## 📋 Requisitos Previos

1. **Cuenta de GitHub** (gratis)
2. **Cuenta de Supabase** (plan gratuito disponible)
3. **Cuenta de Vercel** (gratis)

## 🔧 Pasos para Desplegar

### 1. Preparar el Repositorio

```bash
# Asegúrate de que tu código esté en GitHub
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/secret-santa-app.git
git push -u origin main
```

### 2. Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta (gratis)
2. Crea un nuevo proyecto
3. Ejecuta el script SQL completo (`scripts/complete_schema.sql`) en el SQL Editor
4. Ve a **Settings > API** y copia:
   - `Project URL`
   - `anon/public key`

### 3. Desplegar en Vercel

#### Opción A: Desde el Dashboard de Vercel

1. Ve a [vercel.com](https://vercel.com) y crea una cuenta (con GitHub)
2. Click en **"Add New Project"**
3. Importa tu repositorio de GitHub
4. Configura las variables de entorno (ver abajo)
5. Click en **"Deploy"**

#### Opción B: Desde la CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Para producción
vercel --prod
```

### 4. Variables de Entorno en Vercel

En el dashboard de Vercel, ve a **Settings > Environment Variables** y agrega:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
RESEND_API_KEY=tu_resend_api_key (opcional, solo si usas emails)
NEXT_PUBLIC_SITE_URL=https://tu-dominio.vercel.app
```

**Importante:** 
- Marca estas variables como disponibles en **Production, Preview, y Development**
- `NEXT_PUBLIC_SITE_URL` debe ser la URL de tu deployment en Vercel

### 5. Configurar Supabase para Producción

En Supabase Dashboard:

1. **Authentication > URL Configuration:**
   - Agrega tu URL de Vercel a "Site URL"
   - Agrega `https://tu-dominio.vercel.app/**` a "Redirect URLs"

2. **Verifica que el trigger esté activo:**
   - Ve a Database > Functions
   - Verifica que `handle_new_user` existe

## 💰 Costos

### Vercel (Gratis)
- ✅ Plan Hobby: **$0/mes**
- ✅ Suficiente para proyectos personales y pequeños

### Supabase (Gratis con límites)
- ✅ Plan Free: **$0/mes**
- ✅ 500MB base de datos
- ✅ 2GB de transferencia
- ✅ 50,000 usuarios activos mensuales
- ✅ 2 millones de requests por mes

**Para tu app de Amigo Secreto, el plan gratuito es más que suficiente.**

## ⚠️ Limitaciones del Plan Gratuito

### Vercel
- Builds pueden tardar un poco más (siguen siendo rápidos)
- No hay soporte prioritario (pero hay documentación excelente)

### Supabase
- Base de datos limitada a 500MB (suficiente para miles de sorteos)
- Si superas los límites, puedes actualizar a un plan de pago

## 🔒 Seguridad

1. **Nunca commits las variables de entorno** a GitHub
2. **Usa siempre HTTPS** (Vercel lo proporciona automáticamente)
3. **Configura RLS correctamente** en Supabase (ya está hecho en el script SQL)

## 📝 Checklist Pre-Deploy

- [ ] Código en GitHub
- [ ] Script SQL ejecutado en Supabase
- [ ] Variables de entorno configuradas en Vercel
- [ ] URLs de redirect configuradas en Supabase
- [ ] Probar login/registro después del deploy
- [ ] Verificar que los emails funcionen (si usas Resend)

## 🎉 ¡Listo!

Una vez desplegado, tu app estará disponible en:
`https://tu-proyecto.vercel.app`

Vercel te dará una URL automática, pero también puedes usar un dominio personalizado gratis.

