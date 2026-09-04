import styles from './DataFlowSchematic.module.css'

// The same input takes two materially different paths: concatenated into
// executable SQL, or bound as inert data. Adjacent copy carries the accessible
// explanation, so the dense diagram itself remains decorative.
export function DataFlowSchematic() {
  return (
    <div className={styles.frame} aria-hidden="true" data-testid="data-flow-schematic">
      <div className={styles.scan} />

      <svg className={styles.wires} viewBox="0 0 440 540" preserveAspectRatio="none">
        <path className={styles.baseWire} d="M142 112H184" />
        <path className={styles.baseWire} d="M272 184V218H108V246" />
        <path className={styles.baseWire} d="M350 184V246" />
        <path className={styles.baseWire} d="M108 356V405H220V432" />
        <path className={styles.baseWire} d="M350 382V405H286V432" />

        <path className={styles.inputRail} d="M142 112H184" />
        <path className={styles.unsafeRail} d="M272 184V218H108V246" />
        <path className={styles.safeRail} d="M350 184V246" />
        <path className={styles.unsafeRail} d="M108 356V405H220V432" />
        <path className={styles.safeRail} d="M350 382V405H286V432" />
      </svg>

      <section className={`${styles.node} ${styles.payload}`}>
        <p>01 / USER INPUT</p>
        <code>
          user <b>admin&apos; --</b>
        </code>
        <code>pass ••••••</code>
      </section>

      <section className={`${styles.node} ${styles.composer}`}>
        <p>02 / QUERY COMPOSER</p>
        <code>SELECT * FROM users</code>
        <code>
          WHERE user = <b>input</b>
        </code>
        <span>STRUCTURE + VALUE</span>
      </section>

      <section className={`${styles.node} ${styles.parser}`}>
        <p>03A / SQL PARSER</p>
        <code>
          user = &apos;<b>admin&apos; --</b>&apos;
        </code>
        <span className={styles.unsafe}>INPUT BECOMES CODE</span>
      </section>

      <section className={`${styles.node} ${styles.boundary}`}>
        <p>03B / PARAMETER BOUNDARY</p>
        <code>WHERE user = ?</code>
        <code>
          [1] <b>&quot;admin&apos; --&quot;</b>
        </code>
        <span className={styles.safe}>INPUT STAYS DATA</span>
      </section>

      <section className={`${styles.node} ${styles.database}`}>
        <p>04 / DATABASE</p>
        <div className={styles.tables}>
          <span>
            <b>USERS</b>
            id · username · role
          </span>
          <span>
            <b>SESSIONS</b>
            id · user_id · token
          </span>
        </div>
      </section>

      <div className={styles.legend}>
        <span className={styles.unsafe}>UNSAFE / QUERY TEXT</span>
        <span className={styles.safe}>SAFE / BOUND VALUE</span>
      </div>
    </div>
  )
}
