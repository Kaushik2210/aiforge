# Research notes: Realm 2, Mathematics & ML Foundations

Accessed 2026-11-09. All points are paraphrased.

## Quest: Gradient Descent

### Sources fetched this session

1. **Ruder, "An overview of gradient descent optimization algorithms"**
   https://arxiv.org/abs/1609.04747 (v1 Sept 2016, v2 June 2017).
   Best for: the taxonomy of batch / stochastic / mini-batch variants and why
   adaptive methods exist. Frames optimizers as things people use as black
   boxes without understanding their behaviour.

2. **Kingma & Ba, "Adam: A Method for Stochastic Optimization"**
   https://arxiv.org/abs/1412.6980 (ICLR 2015). Best for: the reference
   description of Adam (adaptive step sizes from estimates of first and second
   gradient moments).

3. **Loshchilov & Hutter, "Decoupled Weight Decay Regularization"**
   https://arxiv.org/abs/1711.05101 (ICLR 2019). Key claim: L2 regularization
   and weight decay are equivalent for plain SGD but not for adaptive methods
   such as Adam; decoupling them (AdamW) improves generalization.

4. **Stanford CS231n, Optimization notes**
   https://cs231n.github.io/optimization-1/ Best for: gradient as steepest
   ascent, step size as the key hyperparameter, numerical vs analytic
   gradients, gradient checking, mini-batch practice. Uses h = 1e-5 in its
   finite-difference code and recommends the centered difference. Typical
   mini-batch sizes 32/64/128, set mostly by memory.

5. **Dive into Deep Learning, section on gradient descent**
   https://d2l.ai/chapter_optimization/gd.html Best for: the 1-D demo on
   f(x) = x^2, learning-rate failure modes, local minima, and the idea of
   preconditioning for badly scaled coordinates.

### Not fetched successfully
- Goodfellow, Bengio, Courville, *Deep Learning*, ch. 4.3
  (https://www.deeplearningbook.org/contents/numerical.html): the page content
  was truncated by the fetcher. TODO-VERIFY before citing as a source.

### Numbers we derived ourselves (and re-ran in Python)
For f(x) = x^2, the update x <- x - lr * 2x multiplies x by (1 - 2*lr) each
step, so:
- lr = 0.2: factor 0.6, x0 = 10 gives 10 * 0.6^10 ~ 0.0605 after 10 steps.
- lr = 0.05: factor 0.9, gives ~3.487.
- lr = 1.0: factor -1, x oscillates between 10 and -10 forever.
- lr = 1.1: factor -1.2, |x| grows (~61.9 after 10 steps).
Convergence needs |1 - 2*lr| < 1, i.e. 0 < lr < 1 for this function. In
general, for a quadratic with curvature L along an axis, stability needs
lr < 2/L.

For f(x1, x2) = x1^2 + 2*x2^2 the curvatures are 2 and 4, so the stable
learning rate is < 0.5, and the fastest-converging single rate balances the
two axes. This is the ill-conditioning story (condition number 2 here).

### Pitfalls and caveats
- "SGD" is commonly used to mean mini-batch SGD.
- Adam with L2 loss is not the same as AdamW (source 3).
- Gradient checking: use the centered difference and compare with relative
  error, not absolute difference.
- Version info: none of these are version-dependent, except that optimizer
  defaults in frameworks change; Day 5 should verify PyTorch defaults.
