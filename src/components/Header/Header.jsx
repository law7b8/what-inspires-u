import { Link } from 'react-router-dom';
import styles from './Header.module.css';

export default function Header() {
    return (
        <header className={styles.wrapper}>
            <Link to="/new" className={styles.shareBtn} id="header-share">
                +
            </Link>

            <div className={styles.topbar}>

                <div className={styles.topbarRight}>
                    <span></span>
                    <span className={styles.issue}></span>
                </div>
            </div>

            <div className={styles.main}>
                <div className={styles.left}>
                    <span className={styles.label}></span>
                    <a
                        href="https://tmp3o.com/"
                        id="header-tmp3o"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.topbarLink}
                    >
                        tmp3o.com
                    </a>

                    <Link to="/" className={styles.titleLink} id="header-title">
                        <h1 className={styles.title}>
                            WHAT INSPIRES <span>U?</span>
                        </h1>
                    </Link>
                    <p className={styles.subtitle}></p>

                    <p className={styles.desc}></p>
                </div>

                <div className={styles.center}></div>

                <div className={styles.right}></div>
            </div>



            <div className={styles.logoBg}>
                <div className={styles.spinContainer} id="header-logo" style={{ opacity: 0 }}>
                    <img src="/logo.jpeg" alt="" aria-hidden="true" />
                </div>
            </div>

        </header>
    );
}
