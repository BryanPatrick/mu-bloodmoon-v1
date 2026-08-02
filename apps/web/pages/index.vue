<template>
  <main class="home-page">
    <section class="home-hero">
      <Transition name="hero-fade" mode="out-in">
        <img :key="activeSlide" :src="currentSlide.image" :alt="currentSlide.alt" class="home-hero-image" :class="currentSlide.position">
      </Transition>
      <div class="home-hero-shade" />

      <div class="bm-container home-hero-layout">
        <div class="home-hero-copy">
          <p class="home-eyebrow"><Diamond class="size-2.5" /> Blood Moon MU Online <Diamond class="size-2.5" /></p>
          <h1>Uma nova era<br>sob a <span>Lua de Sangue.</span></h1>
          <div class="home-title-rule" />
          <p>Um mundo clássico renasce sob uma nova lua.<br>Evolua, conquiste e escreva sua história em <strong>Blood Moon.</strong></p>
          <div class="home-hero-actions">
            <NuxtLink to="/registrar" class="bm-button bm-button-primary">Jogar agora</NuxtLink>
            <NuxtLink to="/about" class="bm-button home-outline-button">Conhecer o servidor</NuxtLink>
          </div>
          <div class="home-server-strip" aria-label="Resumo do servidor">
            <span><i /> Servidor online</span><strong>327 jogadores</strong><strong>Season 1</strong>
          </div>
        </div>

        <div class="home-hero-thumbs" aria-label="Destaques do servidor">
          <button v-for="(slide, index) in heroSlides" :key="slide.alt" :class="{ 'is-active': activeSlide === index }" type="button" @click="activeSlide = index">
            <img :src="slide.image" :alt="slide.alt">
          </button>
        </div>
      </div>
    </section>

    <section id="servidor" class="home-section home-config">
      <div class="bm-container">
        <header class="home-section-heading">
          <p class="home-section-kicker"><Diamond class="size-2" /> Informações principais</p>
          <h2>Configuração do servidor</h2>
          <p>Tudo que você precisa saber antes de começar sua jornada no Blood Moon</p>
        </header>

        <div class="home-config-grid">
          <article v-for="stat in serverStats" :key="stat.label">
            <BloodMoonIcon :name="stat.icon" />
            <div><span>{{ stat.label }}</span><strong :class="{ 'is-online': stat.online }">{{ stat.value }}</strong></div>
          </article>
        </div>

        <header class="home-section-heading home-differentials-heading">
          <p class="home-section-kicker"><Diamond class="size-2" /> Por que jogar aqui? <Diamond class="size-2" /></p>
          <h2>Diferenciais do Blood Moon</h2>
        </header>
        <div class="home-differentials">
          <article v-for="feature in features" :key="feature.title">
            <BloodMoonIcon :name="feature.icon" />
            <div><h3>{{ feature.title }}</h3><p>{{ feature.description }}</p></div>
          </article>
        </div>
      </div>
    </section>

    <section class="home-announcement">
      <div class="bm-container">
        <p><Diamond class="size-2.5" /> <strong>A Lua de Sangue está prestes a surgir.</strong> <Diamond class="size-2.5" /></p>
        <span>Prepare sua conta, entre na comunidade e acompanhe todas as novidades antes da abertura oficial.</span>
      </div>
    </section>

    <section class="home-section home-news">
      <div class="bm-container">
        <header class="home-section-heading">
          <p class="home-section-kicker"><Diamond class="size-2" /> Novidades do servidor</p>
          <h2>Últimas novidades</h2>
          <span class="home-heading-mark" />
        </header>

        <div class="home-news-grid">
          <NuxtLink to="/noticias" class="home-news-main">
            <img src="/images/guide-dark-lord-hero.png" alt="Notícia em destaque do Blood Moon">
            <div class="home-news-content">
              <span><Megaphone class="size-3.5" /> Anúncios</span>
              <h3>{{ featuredNews?.title || 'Abertura oficial em breve' }}</h3>
              <p>{{ featuredNews?.summary || 'Estamos nos ajustes finais para entregar a melhor experiência possível.' }}</p>
              <time><CalendarDays class="size-3.5" /> {{ featuredNews ? formatNewsDate(featuredNews.updatedAt) : '18 de maio de 2026' }}</time>
            </div>
          </NuxtLink>

          <div class="home-news-stack">
            <NuxtLink v-for="(item, index) in secondaryNews" :key="item.id" to="/noticias" class="home-news-small">
              <img :src="index ? '/images/hero-elfa-noria.png' : '/images/guide-dark-lord-hero.png'" :alt="item.title">
              <div><span>{{ index ? 'Eventos' : 'Atualizações' }}</span><h3>{{ item.title }}</h3><p>{{ item.summary }}</p><time><CalendarDays class="size-3" /> {{ formatNewsDate(item.updatedAt) }}</time></div>
            </NuxtLink>
          </div>
        </div>

        <div class="home-community">
          <div class="home-community-icon"><Shield class="size-10" /></div>
          <div><p>Faça parte da comunidade</p><h2>E não perca nada!</h2><span>Junte-se ao nosso Discord, acompanhe todas as novidades e prepare-se para a experiência definitiva em Blood Moon MU.</span></div>
          <div class="home-community-actions"><a href="#" class="bm-button bm-button-primary"><MessageCircle class="size-4" /> Entrar no Discord</a><NuxtLink to="/registrar" class="bm-button bm-button-secondary"><UserPlus class="size-4" /> Criar minha conta</NuxtLink></div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { CalendarDays, Diamond, Megaphone, MessageCircle, Shield, UserPlus } from 'lucide-vue-next'

useSeoMeta({ title: 'Portal Oficial', ogTitle: 'Blood Moon - Portal Oficial' })

type NewsEntry = { id: string; title: string; summary?: string | null; updatedAt: string }
const contentApi = useContentApi()
const publishedNews = ref<NewsEntry[]>([])
try { const result = await contentApi.entries<{ data: NewsEntry[] }>({ kind: 'NEWS', pageSize: 3 }); publishedNews.value = result.data } catch { publishedNews.value = [] }

const fallbackNews: NewsEntry[] = [
  { id: 'patch', title: 'Notas de patch 0.5', summary: 'Ajustes de balanceamento, melhorias no sistema de combate e uma função de qualidade de vida.', updatedAt: '2026-05-18T12:00:00.000Z' },
  { id: 'event', title: 'Prévia do evento de lançamento', summary: 'Grandes recompensas, drop especial e novas criaturas para os primeiros guerreiros.', updatedAt: '2026-05-18T12:00:00.000Z' }
]
const featuredNews = computed(() => publishedNews.value[0])
const secondaryNews = computed(() => [...publishedNews.value.slice(1, 3), ...fallbackNews].slice(0, 2))
const formatNewsDate = (value: string) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value))

const serverStats = [
  { label: 'Season', value: '1', icon: 'season' },
  { label: 'Experiência', value: '999x', icon: 'xp' },
  { label: 'Drop de itens', value: '80%', icon: 'drop' },
  { label: 'Resets', value: 'Ilimitados', icon: 'reset' },
  { label: 'Master level', value: '400+', icon: 'master' },
  { label: 'Status', value: 'Online agora', icon: 'status', online: true }
]
const features = [
  { title: 'Progressão equilibrada', description: 'Evolução justa e recompensadora com economia balanceada para todos.', icon: 'swords' },
  { title: 'Eventos constantes', description: 'Bosses, invasões, Castle Siege e muito mais com grandes prêmios.', icon: 'helmet' },
  { title: 'Rankings competitivos', description: 'Dispute entre os melhores players e guilds e conquiste seu nome.', icon: 'trophy' },
  { title: 'Guias e suporte', description: 'Wiki completa, guias atualizados e suporte dedicado à comunidade.', icon: 'book' }
]

const activeSlide = ref(0)
const heroSlides = [
  { image: '/images/guide-dark-lord-hero.png', alt: 'Guerreiro sob a Lua de Sangue', position: 'object-center' },
  { image: '/images/hero-elfa-noria.png', alt: 'Fairy Elf em Noria', position: 'object-center' },
  { image: '/images/guide-elfa-hero.png', alt: 'Fairy Elf em posição de combate', position: 'object-center' },
  { image: '/images/guide-dark-lord-hero.png', alt: 'Dark Lord em Blood Castle', position: 'object-right' }
]
const currentSlide = computed(() => heroSlides[activeSlide.value] || heroSlides[0])
let interval: ReturnType<typeof setInterval> | undefined
onMounted(() => { interval = setInterval(() => { activeSlide.value = (activeSlide.value + 1) % heroSlides.length }, 7000) })
onBeforeUnmount(() => clearInterval(interval))
</script>

<style scoped>
.home-page{background:#f5f2ec;color:#171313}.home-hero{position:relative;min-height:650px;overflow:hidden;background:#100707}.home-hero-image{position:absolute;inset:0;height:100%;width:100%;object-fit:cover}.home-hero-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,5,5,.94) 0%,rgba(15,5,5,.72) 42%,rgba(15,5,5,.16) 72%,rgba(8,4,4,.3) 100%)}.home-hero-layout{position:relative;z-index:1;display:grid;min-height:650px;grid-template-columns:minmax(0,1fr) 42px;align-items:center;gap:32px;padding-block:68px}.home-hero-copy{max-width:650px;color:#fff}.home-eyebrow,.home-section-kicker{display:flex;align-items:center;justify-content:center;gap:8px;color:#9f0507;font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase}.home-eyebrow{justify-content:flex-start;color:#dc6f70}.home-hero h1{margin-top:14px;font-family:Cinzel,serif;font-size:clamp(3rem,5.5vw,5.2rem);font-weight:500;line-height:.98;text-transform:uppercase}.home-hero h1 span{color:#da3438}.home-title-rule{width:310px;height:1px;margin:26px 0;background:linear-gradient(90deg,#a81418,transparent)}.home-hero-copy>p:last-of-type{font-size:16px;line-height:1.65;color:rgba(255,255,255,.83)}.home-hero-copy strong{color:#ef4444}.home-hero-actions{display:flex;flex-wrap:wrap;gap:14px;margin-top:30px}.home-outline-button{border:1px solid rgba(255,255,255,.58);color:#fff}.home-outline-button:hover{background:#fff;color:#460608}.home-server-strip{display:flex;width:max-content;max-width:100%;margin-top:14px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);font-size:10px;text-transform:uppercase}.home-server-strip>*{padding:9px 13px;border-right:1px solid rgba(255,255,255,.12)}.home-server-strip>*:last-child{border:0}.home-server-strip span{color:#96d697}.home-server-strip i{display:inline-block;width:6px;height:6px;margin-right:5px;border-radius:50%;background:#4ade80}.home-hero-thumbs{display:grid;gap:8px}.home-hero-thumbs button{width:36px;height:52px;padding:2px;border:1px solid rgba(255,255,255,.65);background:rgba(0,0,0,.55)}.home-hero-thumbs button.is-active{border-color:#bf0202;box-shadow:0 0 0 1px #bf0202}.home-hero-thumbs img{width:100%;height:100%;object-fit:cover}.home-section{padding:54px 0}.home-section-heading{text-align:center}.home-section-heading h2{margin-top:7px;color:#171313;font-family:Manifold,Inter,sans-serif;font-size:30px;font-weight:800;text-transform:uppercase}.home-section-heading>p:last-child{margin-top:7px;color:#5d5752;font-size:13px}.home-config-grid{display:grid;grid-template-columns:repeat(3,1fr);margin-top:28px;border:1px solid #d7d0c8;border-radius:8px;overflow:hidden}.home-config-grid article{display:flex;min-height:112px;align-items:center;gap:22px;padding:24px 34px;border-right:1px solid #ded7d0;border-bottom:1px solid #ded7d0}.home-config-grid article:nth-child(3n){border-right:0}.home-config-grid article:nth-child(n+4){border-bottom:0}.home-config-grid svg{width:36px;height:36px;color:#6b1014;stroke-width:1.25}.home-config-grid span{display:block;color:#5f5954;font-size:10px;font-weight:800;text-transform:uppercase}.home-config-grid strong{display:block;margin-top:4px;color:#171313;font-size:24px;font-weight:500}.home-config-grid strong.is-online{color:#2c9b4e;font-size:20px;text-transform:uppercase}.home-differentials-heading{margin-top:56px}.home-differentials{display:grid;grid-template-columns:repeat(4,1fr);gap:26px;margin-top:28px}.home-differentials article{display:grid;grid-template-columns:48px 1fr;gap:14px}.home-differentials svg{width:42px;height:42px;color:#73090b;fill:#73090b;stroke-width:1.3}.home-differentials h3{font-size:11px;font-weight:900;text-transform:uppercase}.home-differentials p{margin-top:6px;font-size:11px;line-height:1.55}.home-announcement{text-align:center;padding:22px 0 8px}.home-announcement p{display:flex;align-items:center;justify-content:center;gap:12px;color:#73090b}.home-announcement strong{font-size:clamp(1.5rem,3vw,2.5rem)}.home-announcement span{display:block;margin-top:7px;font-size:14px;font-weight:800}.home-news{padding-top:32px}.home-heading-mark{display:block;width:5px;height:5px;margin:8px auto 0;transform:rotate(45deg);background:#73090b}.home-news-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:16px;max-width:980px;margin:28px auto 0}.home-news-main,.home-news-small{overflow:hidden;border:1px solid #ded7d0;border-radius:8px;background:#ebe6df;color:inherit;transition:transform .18s ease,box-shadow .18s ease}.home-news-main:hover,.home-news-small:hover{transform:translateY(-2px);box-shadow:0 12px 26px rgba(70,6,8,.1)}.home-news-main>img{width:100%;height:240px;object-fit:cover}.home-news-content{padding:18px}.home-news-content>span,.home-news-small span{display:flex;align-items:center;gap:6px;color:#73090b;font-size:10px;font-weight:800;text-transform:uppercase}.home-news-content h3{margin-top:8px;font-size:20px;font-weight:850;text-transform:uppercase}.home-news-content p,.home-news-small p{margin-top:6px;color:#645d58;font-size:11px;line-height:1.5}.home-news-content time,.home-news-small time{display:flex;align-items:center;gap:6px;margin-top:12px;font-size:9px;font-weight:800;text-transform:uppercase}.home-news-stack{display:grid;gap:16px}.home-news-small{display:grid;grid-template-columns:42% 1fr;min-height:0}.home-news-small>img{width:100%;height:100%;object-fit:cover}.home-news-small>div{padding:18px}.home-news-small h3{margin-top:5px;font-size:17px;font-weight:850;text-transform:uppercase}.home-community{display:grid;grid-template-columns:72px minmax(0,1fr) auto;align-items:center;gap:22px;margin-top:36px;padding:24px 34px;background:#ebe6df}.home-community-icon{display:grid;width:68px;height:68px;place-items:center;border-right:1px solid #d0c7bf;color:#73090b}.home-community p{font-size:11px;font-weight:900;text-transform:uppercase}.home-community h2{color:#73090b;font-size:21px;font-weight:900;text-transform:uppercase}.home-community span{font-size:10px}.home-community-actions{display:flex;gap:10px}.hero-fade-enter-active,.hero-fade-leave-active{transition:opacity .4s ease}.hero-fade-enter-from,.hero-fade-leave-to{opacity:0}
@media(max-width:1023px){.home-hero,.home-hero-layout{min-height:580px}.home-config-grid{grid-template-columns:repeat(2,1fr)}.home-config-grid article,.home-config-grid article:nth-child(3n){border-right:1px solid #ded7d0;border-bottom:1px solid #ded7d0}.home-config-grid article:nth-child(2n){border-right:0}.home-config-grid article:nth-child(n+5){border-bottom:0}.home-differentials{grid-template-columns:repeat(2,1fr)}.home-community{grid-template-columns:62px 1fr}.home-community-actions{grid-column:1/-1;justify-content:center}.home-news-grid{grid-template-columns:1fr}}
@media(max-width:640px){.home-hero,.home-hero-layout{min-height:610px}.home-hero-layout{grid-template-columns:1fr;padding-block:44px}.home-hero-thumbs{position:absolute;right:22px;bottom:22px;display:flex}.home-hero-thumbs button{width:34px;height:38px}.home-hero h1{font-size:2.65rem}.home-title-rule{width:180px}.home-hero-copy>p:last-of-type{font-size:14px}.home-server-strip{font-size:8px}.home-server-strip>*{padding:8px}.home-section{padding:42px 0}.home-section-heading h2{font-size:23px}.home-config-grid{grid-template-columns:1fr}.home-config-grid article,.home-config-grid article:nth-child(2n),.home-config-grid article:nth-child(3n),.home-config-grid article:nth-child(n+5){min-height:82px;padding:16px 22px;border-right:0;border-bottom:1px solid #ded7d0}.home-config-grid article:last-child{border-bottom:0}.home-config-grid svg{width:30px;height:30px}.home-config-grid strong{font-size:20px}.home-differentials{grid-template-columns:1fr}.home-announcement strong{font-size:1.5rem}.home-news-small{grid-template-columns:38% 1fr}.home-community{grid-template-columns:1fr;padding:22px;text-align:center}.home-community-icon{margin:auto;border:0}.home-community-actions{flex-direction:column}.home-community-actions .bm-button{width:100%}}
.home-hero-copy{max-width:760px}
</style>
