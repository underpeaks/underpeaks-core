import 'package:flutter/material.dart';

class NxfIcon extends StatelessWidget {
  final IconData icon;
  final double? size;
  final Color? color;

  const NxfIcon({
    super.key,
    required this.icon,
    this.size,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Icon(
      icon,
      size: size,
      color: color,
    );
  }
}
