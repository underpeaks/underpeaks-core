import 'package:flutter/material.dart';

class NxfBadge extends StatelessWidget {
  final Widget child;
  final Widget badgeContent;
  final AlignmentGeometry alignment;
  final Color? color;

  const NxfBadge({
    super.key,
    required this.child,
    required this.badgeContent,
    this.alignment = Alignment.topRight,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: alignment,
      children: [
        child,
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: color ?? Colors.red,
            shape: BoxShape.circle,
          ),
          constraints: const BoxConstraints(minWidth: 20, minHeight: 20),
          child: Center(child: badgeContent),
        ),
      ],
    );
  }
}
