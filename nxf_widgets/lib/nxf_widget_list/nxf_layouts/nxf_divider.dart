import 'package:flutter/material.dart';

class NxfDivider extends StatelessWidget {
  final double thickness;
  final Color? color;
  final double? indent;
  final double? endIndent;

  const NxfDivider({
    super.key,
    this.thickness = 1,
    this.color,
    this.indent,
    this.endIndent,
  });

  @override
  Widget build(BuildContext context) {
    return Divider(
      thickness: thickness,
      color: color,
      indent: indent,
      endIndent: endIndent,
    );
  }
}
