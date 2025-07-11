import 'package:flutter/material.dart';

typedef NxfAnimatedListItemBuilder = Widget Function(
  BuildContext context,
  int index,
  Animation<double> animation,
);

class NxfSliverAnimatedList extends StatelessWidget {
  final NxfAnimatedListItemBuilder itemBuilder;
  final int initialItemCount;
  final Key listKey;

  const NxfSliverAnimatedList({
    super.key,
    required this.itemBuilder,
    required this.initialItemCount,
    required this.listKey,
  });

  @override
  Widget build(BuildContext context) {
    return SliverAnimatedList(
      key: listKey,
      initialItemCount: initialItemCount,
      itemBuilder: itemBuilder,
    );
  }
}
