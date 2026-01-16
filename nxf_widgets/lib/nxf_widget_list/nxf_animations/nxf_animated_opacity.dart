import 'package:flutter/material.dart';

class NxfAnimatedOpacity extends StatelessWidget {
  final Widget child;
  final double opacity;
  final Duration duration;

  const NxfAnimatedOpacity({
    super.key,
    required this.child,
    required this.opacity,
    required this.duration,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedOpacity(
      opacity: opacity,
      duration: duration,
      child: child,
    );
  }
}