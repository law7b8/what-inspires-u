import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import styles from './Hero.module.css';

export default function Hero() {
    const discRef = useRef(null);
    const discCaseRef = useRef(null);
    const caseWrapRef = useRef(null);
    const optionsRef = useRef(null);

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger);

        const timer = setTimeout(() => {
            const headerLogo = document.getElementById('header-logo');
            const disc = discRef.current;

            if (!disc || !headerLogo) {
                console.warn('refs missing:', { disc, headerLogo });
                return;
            }

            gsap.set('#header-logo', { opacity: 0, rotation: 0 });
            gsap.set(disc, { rotation: 0, transformPerspective: 800 });
            gsap.set(caseWrapRef.current, { transformPerspective: 800, z: 0 });
            gsap.set(discCaseRef.current, { transformPerspective: 800, z: 0 });

            const logoRect = headerLogo.getBoundingClientRect();
            const discRect = disc.getBoundingClientRect();

            const targetX = logoRect.left - discRect.left + (logoRect.width / 2 - discRect.width / 2);
            const targetY = logoRect.top - discRect.top + (logoRect.height / 2 - discRect.height / 2);
            const targetScale = logoRect.width / discRect.width;

            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: '#hero',
                    start: 'top top',
                    end: '+=100%',        // pin for one full viewport height of scroll
                    pin: true,            // locks the hero in place while you scroll
                    scrub: 0.5,
                    snap: {
                        snapTo: 1,          // snap to end when close enough
                        duration: 0.2,
                        ease: 'power2.inOut',
                    },
                    onLeave: () => {
                        gsap.set(disc, { opacity: 0.13, transformPerspective: 800 });
                        gsap.to(disc, {
                            rotationX: '+=360',
                            rotationY: '+=360',
                            rotationZ: '+=360',
                            duration: 15,
                            ease: 'none',
                            repeat: -1,
                        });
                        gsap.set('#header-logo', { opacity: 0.13, transformPerspective: 800 });
                        gsap.to('#header-logo', {
                            rotationX: '+=360',
                            rotationY: '+=360',
                            rotationZ: '+=360',
                            duration: 15,
                            ease: 'none',
                            repeat: -1,
                        });
                    },
                    onEnterBack: () => {
                        gsap.killTweensOf(disc);
                        gsap.killTweensOf('#header-logo');
                        gsap.set(disc, { opacity: 0 });
                        gsap.set('#header-logo', { opacity: 0 });
                    }
                }
            });

            tl
                .to(caseWrapRef.current, {
                    scale: 0.7,
                    z: -400,
                    opacity: 0,
                    ease: 'none',
                }, 0)

                // case image flies back independently
                .to(discCaseRef.current, {
                    z: -500,
                    scale: 0.5,
                    opacity: 0,
                    ease: 'none',
                }, 0)

                // disc comes forward
                .to(disc, {
                    scale: 1.4,
                    z: 300,
                    ease: 'none',
                }, 0)
                .to(disc, {
                    x: targetX,
                    y: targetY,
                    scale: targetScale,
                    opacity: 0,
                    rotationX: 180,
                    rotationY: 180,
                    rotationZ: 180,
                    ease: 'none',
                }, 0)
                .to('#header-logo', { opacity: 1, ease: 'none' }, 0)
                .to(optionsRef.current, { x: -60, opacity: 0 }, 0)
                .to(caseWrapRef.current, { x: 40, opacity: 0 }, 0);
            ScrollTrigger.refresh();
        }, 100);

        return () => {
            clearTimeout(timer);
            ScrollTrigger.getAll().forEach(t => t.kill());
        };
    }, []);

    return (
        <section className={styles.hero} id="hero">

            <div className={styles.caseWrap} ref={caseWrapRef}>

                {/* options — left side */}
                <div className={styles.options} ref={optionsRef}>


                    {/*}
                    
                        can be used for sorting options later\

                    <Link to="/?sort=newest" className={`${styles.opt} ${styles.optActive}`}>newest</Link>
                    <Link to="/?sort=most" className={styles.opt}>most liked</Link>
                    <Link to="/?sort=random" className={styles.opt}>random</Link>
                    <Link to="/new" className={styles.opt}>+ share</Link>
                    ///

                    */}

                    <a
                        href="https://tmp3o.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.topbarLink}
                    >
                        tmp3o.com
                    </a>

                    <Link to="/" className={styles.titleLink}>
                        <h1 className={styles.title}>
                            WHAT INSPIRES <span>U?</span>
                        </h1>
                    </Link>
                </div>




                {/* cd case body */}
                <div className={styles.caseBody}>
                    <div className={styles.discSlot}>

                        <div className={styles.disc} ref={discRef}>
                            {/* cd spine */}
                            <div className={styles.spine}>
                                <span className={styles.spineText}>+TEMPO · what inspires u</span>
                            </div>
                            <img
                                src="/cd1.png"
                                className={styles.discCase}
                                ref={discCaseRef}
                                alt=""
                                aria-hidden="true"
                            />
                            <img
                                src="/tempoLogo.png"
                                className={styles.discLogo}
                                alt=""
                                aria-hidden="true"
                            />
                        </div>

                    </div>
                </div>

            </div>

            {/* scroll hint */}
            <div className={styles.scrollHint}>
                <span>scroll</span>
                <div className={styles.scrollArrow} />
            </div>

        </section>
    );
}