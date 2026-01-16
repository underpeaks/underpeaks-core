import 'package:flutter/material.dart';

class NxfAnimatedCrossFade extends StatelessWidget {
  final Widget firstChild;
  final Widget secondChild;
  final bool showFirst;

  const NxfAnimatedCrossFade({
    super.key,
    required this.firstChild,
    required this.secondChild,
    required this.showFirst,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedCrossFade(
      duration: const Duration(milliseconds: 300),
      firstChild: firstChild,
      secondChild: secondChild,
      crossFadeState: showFirst ? CrossFadeState.showFirst : CrossFadeState.showSecond,
    );
  }
}