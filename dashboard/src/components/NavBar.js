import styles from "../style_modules/NavBar.module.css"
import chipmunk_no_bg from "../images/chipmunk_compressed_no_bg_hotpink.svg";
import { USERNAME } from "../App";

export function NavBar() {

    return (
        <div className={styles.navbar}>
            <img src={chipmunk_no_bg} alt="company logo" className={styles.logo} />
            <h1 className={styles.title}>Real Time Trading Dashboard</h1>
            <span className={styles.account_login}>Hello, <span className={styles.username}>{USERNAME}</span></span>

        </div>
    );
}