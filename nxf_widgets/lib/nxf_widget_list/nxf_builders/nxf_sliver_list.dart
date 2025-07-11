import 'package:flutter/material.dart';

class NxfSliverList extends StatelessWidget {
  final List<Widget> children;

  const NxfSliverList({
    super.key,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return SliverList(
      delegate: SliverChildListDelegate(children),
    );
  }
}
