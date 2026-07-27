import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  PinchGestureHandler,
  State,
  type PinchGestureHandlerStateChangeEvent,
  type PanGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import { colors, spacing } from '@/theme';

/**
 * Full-screen image viewer with pinch-to-zoom and drag-to-pan.
 *
 * Uses gesture-handler's classic handlers + the RN Animated API (no Reanimated,
 * so no extra Babel config) and renders inside a Modal wrapped in its own
 * GestureHandlerRootView — the supported way to use gestures inside a Modal.
 */
export function ImageViewer({
  visible,
  uri,
  label,
  onClose,
}: {
  visible: boolean;
  uri: string | null;
  label?: string;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();

  const baseScale = useRef(new Animated.Value(1)).current;
  const pinchScale = useRef(new Animated.Value(1)).current;
  const scale = Animated.multiply(baseScale, pinchScale);
  const lastScale = useRef(1);

  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef({ x: 0, y: 0 });

  const pinchRef = useRef(null);
  const panRef = useRef(null);

  // Reset zoom/pan whenever a new image opens.
  useEffect(() => {
    if (!visible) return;
    lastScale.current = 1;
    lastOffset.current = { x: 0, y: 0 };
    baseScale.setValue(1);
    pinchScale.setValue(1);
    translateX.setOffset(0);
    translateX.setValue(0);
    translateY.setOffset(0);
    translateY.setValue(0);
  }, [visible, uri, baseScale, pinchScale, translateX, translateY]);

  const onPinchEvent = Animated.event([{ nativeEvent: { scale: pinchScale } }], {
    useNativeDriver: true,
  });
  const onPinchStateChange = (e: PinchGestureHandlerStateChangeEvent) => {
    if (e.nativeEvent.oldState === State.ACTIVE) {
      const next = Math.max(1, Math.min(lastScale.current * e.nativeEvent.scale, 5));
      lastScale.current = next;
      baseScale.setValue(next);
      pinchScale.setValue(1);
    }
  };

  const onPanEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: true }
  );
  const onPanStateChange = (e: PanGestureHandlerStateChangeEvent) => {
    if (e.nativeEvent.oldState === State.ACTIVE) {
      lastOffset.current.x += e.nativeEvent.translationX;
      lastOffset.current.y += e.nativeEvent.translationY;
      translateX.setOffset(lastOffset.current.x);
      translateX.setValue(0);
      translateY.setOffset(lastOffset.current.y);
      translateY.setValue(0);
    }
  };

  return (
    <Modal visible={visible && !!uri} transparent animationType="fade" onRequestClose={onClose}>
      <GestureHandlerRootView style={styles.root}>
        <PanGestureHandler
          ref={panRef}
          simultaneousHandlers={pinchRef}
          minPointers={1}
          maxPointers={2}
          avgTouches
          onGestureEvent={onPanEvent}
          onHandlerStateChange={onPanStateChange}
        >
          <Animated.View style={styles.root}>
            <PinchGestureHandler
              ref={pinchRef}
              simultaneousHandlers={panRef}
              onGestureEvent={onPinchEvent}
              onHandlerStateChange={onPinchStateChange}
            >
              <Animated.Image
                source={uri ? { uri } : undefined}
                resizeMode="contain"
                style={[
                  { width, height: height * 0.82 },
                  { transform: [{ scale }, { translateX }, { translateY }] },
                ]}
              />
            </PinchGestureHandler>
          </Animated.View>
        </PanGestureHandler>

        <View style={styles.topBar} pointerEvents="box-none">
          <Text style={styles.label}>{label ?? ''}</Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <Text style={styles.hint}>Pinch to zoom · drag to move · ✕ to close</Text>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 48,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { color: '#fff', fontSize: 16, fontWeight: '700' },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  hint: {
    position: 'absolute',
    bottom: 40,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
});
