"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Film, Play, Settings, Tv } from "lucide-react";
import { Media } from "@/lib/media";
import { StremioMeta, fetchCinemetaCatalog, fetchCinemetaMeta } from "@/lib/stremio";

const picks: StremioMeta[] = [
  { id: "tt15239678", type: "movie", name: "Dune: Part Two", year: "2024", genres: ["Adventure", "Sci-Fi"], description: "Paul Atreides joins forces with Chani and the Fremen on a journey that will decide the fate of the universe." },
  { id: "tt15398776", type: "movie", name: "Oppenheimer", year: "2023", genres: ["Drama", "History"], description: "Christopher Nolan's portrait of the scientist whose work changed the world." },
  { id: "tt12037194", type: "movie", name: "Furiosa: A Mad Max Saga", year: "2024", genres: ["Action", "Adventure"], description: "A young warrior fights to find her way home across a world gone mad." },
  { id: "tt0816692", type: "movie", name: "Interstellar", year: "2014", genres: ["Adventure", "Sci-Fi"], description: "A team of explorers travels beyond this galaxy to discover whether mankind has a future among the stars." },
  { id: "tt1856101", type: "movie", name: "Blade Runner 2049", year: "2017", genres: ["Sci-Fi", "Thriller"], description: "A new blade runner uncovers a secret that leads him to search for a missing legend." },
  { id: "tt1745960", type: "movie", name: "Top Gun: Maverick", year: "2022", genres: ["Action", "Drama"], description: "Maverick returns to train a new generation of pilots for a mission unlike any other." },
].map(movie => ({ ...movie, background: `https://images.metahub.space/background/medium/${movie.id}/img`, poster: `https://images.metahub.space/poster/medium/${movie.id}/img` }));

function Artwork({ src, className = "" }: { src?: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && !failed ? <img className={className} src={src} alt="" onError={() => setFailed(true)} /> : <div className={`watch-art-fallback ${className}`}><Film aria-hidden="true" /></div>;
}


function StremioLogo() {
  return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 2 46 24 24 46 2 24Z" fill="white" opacity=".22"/><path d="m19 12 18 12-18 12Z" fill="white"/><path d="m11 17 8-5v24l-8-5Z" fill="white" opacity=".55"/></svg>;
}
function YouTubeLogo() {
  return <svg viewBox="0 0 64 45" aria-hidden="true"><path d="M62.7 7A8 8 0 0 0 57 1.4C52 0 32 0 32 0S12 0 7 1.4A8 8 0 0 0 1.3 7C0 12 0 22.5 0 22.5S0 33 1.3 38A8 8 0 0 0 7 43.6C12 45 32 45 32 45s20 0 25-1.4a8 8 0 0 0 5.7-5.6C64 33 64 22.5 64 22.5S64 12 62.7 7Z" fill="#ff0033"/><path d="m26 13 17 9.5L26 32Z" fill="white"/></svg>;
}

export default function CabinLauncher({
  onNavigate, onOpenMovie, onPlayMedia, history = [],
}: {
  onNavigate: (page: string) => void;
  onOpenMovie: (movie: StremioMeta) => void;
  onPlayMedia: (media: Media) => void;
  history?: Media[];
}) {
  const [movies, setMovies] = useState(picks);
  const [heroIndex, setHeroIndex] = useState(0);
  const [catalogLive, setCatalogLive] = useState(false);
  const rail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    fetchCinemetaCatalog("movie").then(items => {
      const usable = items.filter(item => item.id && item.name && (item.background || item.poster)).slice(0, 18);
      if (!cancelled && usable.length) {
        setMovies(usable);
        setHeroIndex(0);
        setCatalogLive(true);
      }
    });
    return () => { cancelled = true; };
  }, []);
  const heroMovies = picks.slice(0, 5);
  const selectedHero = heroMovies[heroIndex] || heroMovies[0];
  const [heroMeta, setHeroMeta] = useState<StremioMeta | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setLogoFailed(false);
    fetchCinemetaMeta("movie", selectedHero.id).then(meta => { if (!cancelled) setHeroMeta(meta); });
    return () => { cancelled = true; };
  }, [selectedHero.id]);
  const hero = heroMeta?.id === selectedHero.id ? { ...selectedHero, ...heroMeta } : selectedHero;
  const changeHero = (step: number) => setHeroIndex(i => (i + step + heroMovies.length) % heroMovies.length);

  return (
    <div className="watch-dashboard">
      <h1 className="watch-sr-only">Volta TV — your entertainment, together</h1>
      <div className="watch-top-grid">
        <section className="watch-hero" aria-label="Featured Stremio movies" aria-roledescription="carousel">
          <Artwork src={hero.background || hero.poster} className="watch-hero-image" />
          <div className="watch-hero-shade" />
          <div className="watch-hero-content">
            <span className="watch-source"><span className="watch-stremio-mark"><StremioLogo /></span> stremio <span className="watch-source-divider" /> FEATURED MOVIE</span>
            <h2 className={hero.logo && !logoFailed ? "watch-title-with-logo" : ""}>{hero.logo && !logoFailed ? <img src={hero.logo} alt={hero.name} onError={() => setLogoFailed(true)} /> : hero.name}</h2>
            <p className="watch-meta">{[hero.year, ...(hero.genres || []).slice(0, 2)].filter(Boolean).join(" · ") || "Discover your next great watch"}</p>
            {hero.description && <p className="watch-synopsis">{hero.description}</p>}
            <div className="watch-hero-actions">
              <button className="watch-primary" onClick={() => onOpenMovie(hero)}><Play size={16} fill="currentColor" /> Watch in Stremio</button>
              <button className="watch-secondary" onClick={() => onNavigate("Stremio")}>More movies <ArrowUpRight size={16} /></button>
            </div>
          </div>
          <div className="watch-carousel-controls">
            <div className="watch-dots">{heroMovies.map((movie, index) => <button key={movie.id} aria-label={`Feature ${movie.name}`} aria-pressed={heroIndex === index} onClick={() => setHeroIndex(index)}><span /></button>)}</div>
            <div className="watch-arrows"><button aria-label="Previous featured movie" onClick={() => changeHero(-1)}><ChevronLeft size={18} /></button><span>{String(heroIndex + 1).padStart(2, "0")} / {String(heroMovies.length).padStart(2, "0")}</span><button aria-label="Next featured movie" onClick={() => changeHero(1)}><ChevronRight size={18} /></button></div>
          </div>
        </section>

        <aside className="watch-hub" aria-label="Your apps">
          <div className="watch-section-heading"><div><h2>Your apps<span className="watch-app-count">03</span></h2></div><button className="watch-icon-button" aria-label="Open settings" onClick={() => onNavigate("Settings")}><Settings size={20} /></button></div>
          <div className="watch-apps">
            <button aria-label="Open Stremio" className="watch-app watch-app-stremio" onClick={() => onNavigate("Stremio")}><span className="watch-app-logo"><StremioLogo /><strong>stremio</strong></span><ArrowUpRight className="watch-app-arrow" size={21} /></button>
            <button aria-label="Open YouTube" className="watch-app watch-app-youtube" onClick={() => onNavigate("YouTube")}><span className="watch-app-logo"><YouTubeLogo /><strong>YouTube</strong></span><ArrowUpRight className="watch-app-arrow" size={21} /></button>
            <button aria-label="Open Live TV" className="watch-app watch-app-tv" onClick={() => onNavigate("Live TV")}><span className="watch-app-logo"><Tv /><strong>Live TV</strong><span className="watch-live-dot" /></span><ArrowUpRight className="watch-app-arrow" size={21} /></button>
          </div>
        </aside>
      </div>

      {history.length > 0 && <section className="watch-library-section">
        <div className="watch-section-heading"><div><h2>Continue watching</h2><p>Pick up where you left off.</p></div><button className="watch-text-link" onClick={() => onNavigate("History")}>View history <ChevronRight size={16} /></button></div>
        <div className="watch-movie-rail">{history.slice(0, 6).map(media => <button className="watch-movie" key={media.id} onClick={() => onPlayMedia(media)}><div className="watch-movie-art"><Artwork src={media.image} /><span className="watch-card-play"><Play size={21} fill="currentColor" /></span></div><strong>{media.title}</strong><small>{media.source}{media.duration ? ` · ${media.duration}` : ""}</small></button>)}</div>
      </section>}

      <section className="watch-library-section">
        <div className="watch-section-heading"><div><h2>{catalogLive ? "Popular movies" : "Movie night picks"}</h2></div><div className="watch-rail-actions"><button className="watch-text-link" onClick={() => onNavigate("Stremio")}>Browse all <ArrowUpRight size={16} /></button><button className="watch-icon-button" aria-label="Scroll movies left" onClick={() => rail.current?.scrollBy({left: -600, behavior: "smooth"})}><ChevronLeft size={18} /></button><button className="watch-icon-button" aria-label="Scroll movies right" onClick={() => rail.current?.scrollBy({left: 600, behavior: "smooth"})}><ChevronRight size={18} /></button></div></div>
        <div className="watch-movie-rail watch-poster-rail" ref={rail}>{movies.map(movie => <button className="watch-movie" key={movie.id} onClick={() => onOpenMovie(movie)}><div className="watch-movie-art"><Artwork src={movie.poster || movie.background} /><span className="watch-card-source"><StremioLogo /></span><span className="watch-card-play"><Play size={21} fill="currentColor" /></span></div><strong>{movie.name}</strong><small>{[movie.year, movie.genres?.[0] || "Movie"].filter(Boolean).join(" · ")}</small></button>)}</div>
      </section>
      <div className="watch-footer"><span><span className="watch-footer-brand">VOLTA</span> Movie nights. Upgraded.</span><button onClick={() => onNavigate("Favorites")}>Your saved favorites <ChevronRight size={14} /></button></div>
    </div>
  );
}
