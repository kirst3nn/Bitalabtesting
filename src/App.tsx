import { ArrowDown, ArrowRight, UtensilsCrossed } from "lucide-react";

function App() {
  return (
    <main className="site-shell">
      <header className="site-header">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="Bite Lab home">
          <span className="brand-mark"><UtensilsCrossed size={20} strokeWidth={2.5} /></span>
          <span>BITE<span className="brand-accent">LAB</span></span>
        </a>
        <a className="header-link" href="#about">Our story</a>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="eyebrow">GOOD FOOD. CAMPUS MOOD.</span>
          <h1 id="hero-title">Big flavor<br />for campus life.</h1>
          <p>Meet Bite Lab: a fresh take on the food you crave, made for the moments that make your day.</p>
          <a className="animated-button hero-cta" href="#about">
            <span className="animated-arrow arr-2" aria-hidden="true"><ArrowRight size={20} /></span>
            <span className="animated-button-label">Get to know us</span>
            <span className="circle" aria-hidden="true" />
            <span className="animated-arrow arr-1" aria-hidden="true"><ArrowRight size={20} /></span>
          </a>
          <a className="scroll-cue" href="#about">
            <span>Take a look around</span>
            <ArrowDown size={15} aria-hidden="true" />
          </a>
        </div>

        <div className="hero-art" aria-hidden="true">
          <span className="art-orbit orbit-one" />
          <span className="art-orbit orbit-two" />
          <span className="food-glow" />
          <span className="food-emoji">🍔</span>
          <span className="food-sticker">A little joy<br />in every bite</span>
          <span className="spark spark-one">✳</span>
          <span className="spark spark-two">✦</span>
          <span className="spark spark-three">·</span>
        </div>
        <span className="hero-index" aria-hidden="true">BITE LAB · EST. 2026</span>
      </section>

      <section className="about" id="about" aria-labelledby="about-title">
        <span className="eyebrow">A LITTLE ABOUT US</span>
        <h2 id="about-title">Good food should<br />feel like a good day.</h2>
        <p>
          Bite Lab is a new food idea with campus life in mind. We’re building a place for
          feel-good flavors, easy choices, and meals worth looking forward to.
        </p>
        <span className="about-note"><span aria-hidden="true">✳</span> We’re just getting started. More soon.</span>
      </section>

      <footer className="site-footer">
        <a className="brand footer-brand" href={import.meta.env.BASE_URL} aria-label="Bite Lab home">
          <span className="brand-mark"><UtensilsCrossed size={17} strokeWidth={2.5} /></span>
          <span>BITE<span className="brand-accent">LAB</span></span>
        </a>
        <span className="footer-copy">Fresh bites, good vibes. © 2026 Bite Lab.</span>
        <nav className="footer-links" aria-label="Legal">
          <a href={`${import.meta.env.BASE_URL}privacy.html`}>Privacy</a>
          <a href={`${import.meta.env.BASE_URL}terms.html`}>Terms</a>
        </nav>
      </footer>
    </main>
  );
}

export default App;
