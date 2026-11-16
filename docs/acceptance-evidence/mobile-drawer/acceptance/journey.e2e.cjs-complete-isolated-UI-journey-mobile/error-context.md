# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journey.e2e.cjs >> complete isolated UI journey
- Location: e2e\journey.e2e.cjs:4:1

# Error details

```
Test timeout of 180000ms exceeded.
```

# Page snapshot

```yaml
- main [ref=f5e3]:
  - complementary [ref=f5e4]:
    - generic [ref=f5e5]: ◉ PulseWatch
    - button "Overview" [ref=f5e6] [cursor=pointer]
    - button "Monitors" [ref=f5e7] [cursor=pointer]
    - button "Incidents" [ref=f5e8] [cursor=pointer]
    - button "About" [ref=f5e9] [cursor=pointer]
  - generic [ref=f5e10]:
    - generic [ref=f5e11]:
      - generic [ref=f5e12]:
        - paragraph [ref=f5e13]: PULSEWATCH / INCIDENTS
        - heading "Incidents" [level=1] [ref=f5e14]
      - generic [ref=f5e15]:
        - text: System operational
        - button "+ Add monitor" [ref=f5e17] [cursor=pointer]
    - generic [ref=f5e18]:
      - generic [ref=f5e19]:
        - heading "Recent incidents" [level=2] [ref=f5e20]
        - generic [ref=f5e21]: 0 open
      - 'button "RESOLVED Browser HTTP: Connection refused HTTP · CONNECTION REFUSED · 4 failures First failure 11/15/2026, 11:29:17 PM · Recovered 11/15/2026, 11:29:17 PM" [active] [ref=f5e22] [cursor=pointer]':
        - generic [ref=f5e23]: RESOLVED
        - generic [ref=f5e24]:
          - generic [ref=f5e25]: "Browser HTTP: Connection refused"
          - generic [ref=f5e26]: HTTP · CONNECTION REFUSED · 4 failures
          - generic [ref=f5e27]: First failure 11/15/2026, 11:29:17 PM · Recovered 11/15/2026, 11:29:17 PM
      - 'button "RESOLVED Browser DNS: Connection refused DNS · CONNECTION REFUSED · 4 failures First failure 11/15/2026, 11:29:17 PM · Recovered 11/15/2026, 11:29:17 PM" [ref=f5e28] [cursor=pointer]':
        - generic [ref=f5e29]: RESOLVED
        - generic [ref=f5e30]:
          - generic [ref=f5e31]: "Browser DNS: Connection refused"
          - generic [ref=f5e32]: DNS · CONNECTION REFUSED · 4 failures
          - generic [ref=f5e33]: First failure 11/15/2026, 11:29:17 PM · Recovered 11/15/2026, 11:29:17 PM
      - 'button "RESOLVED Browser SSL: Connection refused SSL · CONNECTION REFUSED · 4 failures First failure 11/15/2026, 11:29:17 PM · Recovered 11/15/2026, 11:29:17 PM" [ref=f5e34] [cursor=pointer]':
        - generic [ref=f5e35]: RESOLVED
        - generic [ref=f5e36]:
          - generic [ref=f5e37]: "Browser SSL: Connection refused"
          - generic [ref=f5e38]: SSL · CONNECTION REFUSED · 4 failures
          - generic [ref=f5e39]: First failure 11/15/2026, 11:29:17 PM · Recovered 11/15/2026, 11:29:17 PM
      - 'button "RESOLVED Browser TCP: Connection refused TCP · CONNECTION REFUSED · 4 failures First failure 11/15/2026, 11:29:17 PM · Recovered 11/15/2026, 11:29:17 PM" [ref=f5e40] [cursor=pointer]':
        - generic [ref=f5e41]: RESOLVED
        - generic [ref=f5e42]:
          - generic [ref=f5e43]: "Browser TCP: Connection refused"
          - generic [ref=f5e44]: TCP · CONNECTION REFUSED · 4 failures
          - generic [ref=f5e45]: First failure 11/15/2026, 11:29:17 PM · Recovered 11/15/2026, 11:29:17 PM
    - complementary "Incident details" [ref=f5e46]:
      - generic [ref=f5e47]:
        - generic [ref=f5e48]:
          - paragraph [ref=f5e49]: INCIDENT DETAILS
          - 'heading "Browser HTTP: Connection refused" [level=2] [ref=f5e50]'
        - button "Close incident details" [ref=f5e51] [cursor=pointer]: ×
      - generic [ref=f5e52]:
        - generic [ref=f5e53]:
          - generic [ref=f5e54]: Status
          - strong [ref=f5e55]:
            - generic [ref=f5e56]: RESOLVED
        - generic [ref=f5e57]:
          - generic [ref=f5e58]: Monitor
          - strong [ref=f5e59]: Browser HTTP
        - generic [ref=f5e60]:
          - generic [ref=f5e61]: Monitor type
          - strong [ref=f5e62]: HTTP / HTTPS
        - generic [ref=f5e63]:
          - generic [ref=f5e64]: Failure category
          - strong [ref=f5e65]: CONNECTION REFUSED
        - generic [ref=f5e66]:
          - generic [ref=f5e67]: First failure
          - strong [ref=f5e68]: 11/15/2026, 11:29:17 PM
        - generic [ref=f5e69]:
          - generic [ref=f5e70]: Latest failure
          - strong [ref=f5e71]: 11/15/2026, 11:29:17 PM
        - generic [ref=f5e72]:
          - generic [ref=f5e73]: Consecutive failures
          - strong [ref=f5e74]: "4"
        - generic [ref=f5e75]:
          - generic [ref=f5e76]: Recovered
          - strong [ref=f5e77]: 11/15/2026, 11:29:17 PM
      - generic [ref=f5e78]:
        - heading "Explanation" [level=3] [ref=f5e79]
        - paragraph [ref=f5e80]: The destination refused the monitoring connection.
        - heading "Recovery" [level=3] [ref=f5e81]
        - paragraph [ref=f5e82]: Recovered with HTTP 200
```