import 'package:flutter/material.dart';

class NxfVerticalDivider extends StatelessWidget {
  final double width;
  final double thickness;
  final Color? color;
  final double? indent;
  final double? endIndent;

  const NxfVerticalDivider({
    super.key,
    this.width = 1,
    this.thickness = 1,
    this.color,
    this.indent,
    this.endIndent,
  });

  @override
  Widget build(BuildContext context) {
    return VerticalDivider(
      width: width,
      thickness: thickness,
      color: color,
      indent: indent,
      endIndent: endIndent,
    );
  }
}
