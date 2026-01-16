import 'package:flutter/material.dart';

class NxfListView extends StatelessWidget {
  final List<Widget> children;
  final Axis scrollDirection;
  final EdgeInsetsGeometry? padding;

  const NxfListView({
    super.key,
    required this.children,
    this.scrollDirection = Axis.vertical,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    return ListView(
      scrollDirection: scrollDirection,
      padding: padding,
      children: children,
    );
  }
}
