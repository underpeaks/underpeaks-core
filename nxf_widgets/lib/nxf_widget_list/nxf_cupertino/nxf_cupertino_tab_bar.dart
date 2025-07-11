import 'package:flutter/cupertino.dart';

class NxfCupertinoTabBar extends StatelessWidget {
  final List<BottomNavigationBarItem> items;
  final ValueChanged<int> onTap;
  final int currentIndex;

  const NxfCupertinoTabBar({
    super.key,
    required this.items,
    required this.onTap,
    this.currentIndex = 0,
  });

  @override
  Widget build(BuildContext context) {
    return CupertinoTabBar(
      items: items,
      onTap: onTap,
      currentIndex: currentIndex,
    );
  }
}