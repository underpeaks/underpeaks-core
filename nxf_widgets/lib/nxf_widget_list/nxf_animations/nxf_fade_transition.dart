import 'package:flutter/material.dart';

class NxfFadeTransition extends StatelessWidget {
  final Animation<double> animation;
  final Widget child;

  const NxfFadeTransition({
    super.key,
    required this.animation,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: animation,
      child: child,
    );
  }
}