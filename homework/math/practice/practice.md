Find the limit,

$$
\lim_{h \to 0^+} \frac{\sqrt{h^2 + 7h + 3} - \sqrt{3}}{h}
$$

If we just subsitute 0, our numerator will evaluate to 0 and we'll have an indeterminate form of 0/0

So we'll simply and multiply by the conjugate

$$
\lim_{h \to 0^+} \frac{(\sqrt{h^2 + 7h + 3} - \sqrt{3})(\sqrt{h^2 + 7h +3} + \sqrt{3})}{h(\sqrt{h^2 + 7h +3} + \sqrt{3})}
$$

Remember

$$
(\sqrt{A} - \sqrt{B})(\sqrt{A} + \sqrt{B}) = A - B
$$

So,

$$
\lim_{h \to 0^+} \frac{(\sqrt{h^2 + 7h + 3} - \sqrt{3})(\sqrt{h^2 + 7h +3} + \sqrt{3})}{h(\sqrt{h^2 + 7h +3} + \sqrt{3})} \\[1em]
\lim_{h \to 0^+} \frac{(h^2 + 7h + 3) - 3}{h(\sqrt{h^2 + 7h +3} + \sqrt{3})} \\[1em]
\lim_{h \to 0^+} \frac{h^2 + 7h}{h(\sqrt{h^2 + 7h +3} + \sqrt{3})} \\[1em]
\lim_{h \to 0^+} \frac{h + 7}{\sqrt{h^2 + 7h +3} + \sqrt{3}} \\[1em]
\lim_{h \to 0^+} \frac{0 + 7}{\sqrt{0^2 + 0 +3} + \sqrt{3}} \\[1em]
\lim_{h \to 0^+} \frac{7}{\sqrt{3} + \sqrt{3}} \\[1em]
\lim_{h \to 0^+} \frac{7}{2\sqrt{3}}
$$

---
