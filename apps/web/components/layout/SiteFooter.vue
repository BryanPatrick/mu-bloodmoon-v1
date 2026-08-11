<template>
  <footer class="bm-site-footer">
    <div class="bm-footer-main bm-container">
      <section class="bm-footer-brand">
        <div class="bm-footer-mark">
          <BloodLogo />
          <div><strong>Blood Moon</strong><span>MU Online</span></div>
        </div>
        <p>
          Um mundo clássico renasce sob uma nova lua.<br />Evolua, conquiste e escreva sua história.
        </p>
      </section>

      <nav
        v-for="group in groups"
        :key="group.title"
        class="bm-footer-group"
        :aria-label="group.title"
      >
        <h3>{{ group.title }} <span aria-hidden="true" /></h3>
        <NuxtLink v-for="item in group.items" :key="item.label" :to="item.to">{{
          item.label
        }}</NuxtLink>
      </nav>
    </div>

    <div class="bm-footer-rule">
      <span><BloodMoonIcon name="progress" /></span>
    </div>

    <div class="bm-footer-bottom bm-container">
      <p>© 2026 Blood Moon MU Online. Todos os direitos reservados.</p>
      <p>Servidor 100% brasileiro <span class="bm-brazil-flag" aria-label="Brasil">◆</span></p>
      <p>Desenvolvido com paixão para a comunidade MU. <span class="bm-footer-heart">♥</span></p>
    </div>
  </footer>
</template>

<script setup lang="ts">
const groups = [
  {
    title: 'Navegação',
    items: [
      { label: 'Início', to: '/' },
      { label: 'Informações', to: '/about' },
      { label: 'Downloads', to: '/downloads' },
      { label: 'Rankings', to: '/rankings' },
      { label: 'Notícias', to: '/noticias' },
      { label: 'Gazeta', to: '/gazeta' },
      { label: 'Roadmap', to: '/roadmap' }
    ]
  },
  {
    title: 'Comunidade',
    items: [
      { label: 'Discord', to: '/comunidade' },
      { label: 'Comunidade', to: '/comunidade' },
      { label: 'Mercado de jogadores', to: '/marketplace' },
      { label: 'Loja oficial', to: '/marketplace?mercado=oficial' }
    ]
  },
  {
    title: 'Suporte',
    items: [
      { label: 'Central de ajuda', to: '/about#contato' },
      { label: 'Regras do servidor', to: '/wiki' },
      { label: 'Política de privacidade', to: '/about' },
      { label: 'Termos de uso', to: '/about' },
      { label: 'Reportar jogador', to: '/comunidade' }
    ]
  },
  {
    title: 'Conta',
    items: [
      { label: 'Criar conta', to: '/registrar' },
      { label: 'Painel do usuário', to: '/painel' },
      { label: 'Recuperar senha', to: '/recuperar-conta' },
      { label: 'Doações', to: '/recarga' },
      { label: 'Entrar', to: '/login' }
    ]
  }
]
</script>

<style scoped>
.bm-site-footer {
  position: relative;
  overflow: hidden;
  border-top: 1px solid #2b1b1a;
  background: #0d0b0c;
  color: #aaa29c;
}
.bm-site-footer::before {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 15% 20%, rgba(115, 9, 11, 0.12), transparent 26rem);
  content: '';
  pointer-events: none;
}
.bm-footer-main {
  position: relative;
  display: grid;
  grid-template-columns: minmax(250px, 1.55fr) repeat(4, minmax(120px, 1fr));
  gap: 42px;
  padding-block: 56px 44px;
}
.bm-footer-brand p {
  max-width: 300px;
  margin-top: 18px;
  font-size: 11px;
  line-height: 1.8;
  color: #7f7771;
}
.bm-footer-mark {
  display: flex;
  align-items: center;
  gap: 12px;
}
.bm-footer-mark :deep(img) {
  height: 68px;
}
.bm-footer-mark strong {
  display: block;
  color: #ded4ca;
  font-family: Cinzel, serif;
  font-size: 22px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.bm-footer-mark span {
  display: block;
  margin-top: 2px;
  color: #857b73;
  font-size: 8px;
  letter-spacing: 0.38em;
  text-transform: uppercase;
}
.bm-footer-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 24px;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}
.bm-footer-group h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: #d5cec7;
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.bm-footer-group h3 span {
  width: 5px;
  height: 5px;
  transform: rotate(45deg);
  border: 1px solid #73090b;
}
.bm-footer-group a {
  width: max-content;
  max-width: 100%;
  color: #817973;
  font-size: 10px;
  line-height: 1.45;
  transition:
    color 0.16s ease,
    transform 0.16s ease;
}
.bm-footer-group a:hover {
  transform: translateX(2px);
  color: #ddd4cc;
}
.bm-footer-rule {
  position: relative;
  height: 26px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.bm-footer-rule span {
  position: absolute;
  top: -18px;
  left: 50%;
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  transform: translateX(-50%) rotate(45deg);
  border: 1px solid #5f201f;
  background: #0d0b0c;
  color: #8d302e;
}
.bm-footer-rule svg {
  width: 20px;
  height: 20px;
  transform: rotate(-45deg);
}
.bm-footer-bottom {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 20px;
  align-items: center;
  padding-top: 3px;
  padding-bottom: 24px;
  font-size: 9px;
  color: #645e59;
}
.bm-footer-bottom p:nth-child(2) {
  text-align: center;
}
.bm-footer-bottom p:last-child {
  text-align: right;
}
.bm-brazil-flag {
  color: #2f9b58;
}
.bm-footer-heart {
  color: #9f0507;
}
@media (max-width: 1000px) {
  .bm-footer-main {
    grid-template-columns: repeat(2, 1fr);
  }
  .bm-footer-brand {
    grid-column: 1/-1;
  }
  .bm-footer-group {
    padding-left: 0;
    border-left: 0;
  }
  .bm-footer-bottom {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .bm-footer-bottom p:last-child {
    text-align: center;
  }
}
@media (max-width: 560px) {
  .bm-footer-main {
    grid-template-columns: 1fr;
    gap: 28px;
    padding-block: 42px 34px;
  }
  .bm-footer-brand {
    grid-column: auto;
  }
  .bm-footer-group {
    padding-top: 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .bm-footer-bottom {
    padding-bottom: 20px;
  }
}
</style>
