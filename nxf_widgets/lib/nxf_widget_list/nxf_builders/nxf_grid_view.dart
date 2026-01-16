import 'package:flutter/material.dart';

class NxfGridView extends StatelessWidget {
  final List<Widget> children;
  final int crossAxisCount;
  final double mainAxisSpacing;
  final double crossAxisSpacing;
  final EdgeInsetsGeometry? padding;

  const NxfGridView({
    super.key,
    required this.children,
    required this.crossAxisCount,
    this.mainAxisSpacing = 8,
    this.crossAxisSpacing = 8,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    return GridView.count(
      crossAxisCount: crossAxisCount,
      mainAxisSpacing: mainAxisSpacing,
      crossAxisSpacing: crossAxisSpacing,
      padding: padding,
      children: children,
    );
  }
}
