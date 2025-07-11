import 'package:flutter/material.dart';

class NxfCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? margin;
  final EdgeInsetsGeometry? padding;
  final double elevation;
  final Color? color;
  final BorderRadius? borderRadius;

  const NxfCard({
    super.key,
    required this.child,
    this.margin,
    this.padding,
    this.elevation = 2,
    this.color,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      color: color,
      elevation: elevation,
      shape: RoundedRectangleBorder(
        borderRadius: borderRadius ?? BorderRadius.circular(8),
      ),
      margin: margin,
      child: Padding(
        padding: padding ?? const EdgeInsets.all(12),
        child: child,
      ),
    );
  }
}
