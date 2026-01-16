import 'package:flutter/material.dart';

class NxfAnimatedContainer extends StatelessWidget {
  final Widget child;
  final Duration duration;
  final BoxDecoration decoration;
  final double width;
  final double height;

  const NxfAnimatedContainer({
    super.key,
    required this.child,
    required this.duration,
    required this.decoration,
    required this.width,
    required this.height,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: duration,
      decoration: decoration,
      width: width,
      height: height,
      child: child,
    );
  }
}