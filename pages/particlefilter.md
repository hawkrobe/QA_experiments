---
layout: page
title: Particle filtering
status: current
---

## Introduction

In more realistic models, best-first search (even when guided by coarse-to-fine estimates) may not be feasible or desirable. Therefore, we would like to understand how coarse-to-fine inference helps in sampling scenarios. Specifically, how can coarse-to-fine inference help particle filters, if at all?

Particles (partial samples) can already be seen as representatives of larger classes of states, in particular when particle filtering is combined with rejuvenation steps. This is an argument that coarse-to-fine inference won't have additional benefits.

Another consideration is that particles are only resampled at factor statements. Without coarse-to-fine, many models may just have a single factor statement at the end. Coarse-to-fine with multiple levels generates intermediate factor statements. More generally, even if a particle filter already has multiple factor statements, coarse-to-fine splits these factors up into smaller factors, which can help inference if the split is not misleading.

A response to this consideration is the following: if the split is perfect, then the first factor exactly replicates the original factor (for distributional purposes) and the second factor doesn't do anything (is uniform).

## When is it good to split a random choice?

Answer: When we can get partial credit for smaller choices.

Example: 20 questions.

Reasoning: It's more difficult to guess a 1/1000 chance than to guess three 1/10 chances where you get feedback and get to retry at each stage if you didn't get it right.

This suggests that we don't want perfect abstractions. Instead, we want to think information-theoretically: if there are n choices, then each choice should provide 1/n of the information. This is still coarse-to-fine, since as we progress to earlier choices, we lose more and more information.

In other words, the ideal coarsening isn't such that the fine-grained level doesn't provide any information. It's such that the fine-grained level provides exactly half of the information (for two-stage coarsening).

What does it mean to provide half of the information? If we think in terms of rejection sampling, it means that the overall KL divergence between prior and posterior is split up into smaller KL divergences.

The ideal coarsening will also be influenced by (a) what fine-grained factors exist (factors determine surprise; want to split it up), and (b) how many variables we are willing to merge (if any).

## When does coarsening help particle filters?

Coarsening helps when we merge multiple states of *different* posterior probability. This leads to smoothing, which makes it easier to sample from the distribution.

## Example

Consider sampling a real number in [0, 1], and conditioning on the number being in some interval [a, b]. The "faithful" coarsening that is most helpful for enumeration techniques groups [0, a] and [b, 1] into one abstract value, and [a, b] into another abstract value. However, this grouping doesn't help particle filters, since the probability of sampling a value in [a, b] is still small (it's \|b - a\|). On the other hand, iterative splitting of the unit interval (corresponding to adding binary digits to the number) is a helpful coarsening.
