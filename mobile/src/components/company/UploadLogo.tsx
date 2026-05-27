import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export const UploadLogo = ({
  uri,
  onPress,
  loading,
}: {
  uri?: string;
  onPress: () => void;
  loading?: boolean;
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      disabled={loading}
      style={styles.uploadBox}
    >
      {uri ? (
        <>
          <Image source={{ uri }} style={styles.uploadImage} />
          <View style={styles.overlayEdit} pointerEvents="box-none">
            {loading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.editText}>Uploading...</Text>
              </View>
            ) : (
              <View style={styles.editButton}>
                <Ionicons name="pencil" size={16} color="#fff" />
                <Text style={styles.editText}>Đổi logo</Text>
              </View>
            )}
          </View>
        </>
      ) : (
        <View style={styles.uploadPlaceholder}>
          {!loading && <Ionicons name="cloud-upload-outline" size={28} color="#999" />}
          <View style={styles.uploadTextRow}>
            <Text style={styles.uploadText}>{loading ? "Uploading..." : "Upload logo"}</Text>
            {loading && (
              <View style={styles.loadingIndicator}>
                <ActivityIndicator size="small" color="#999" style={{ marginLeft: 6 }} />
              </View>
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  uploadBox: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#d9d9d9",
    backgroundColor: "#fafafa",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  uploadPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },

  uploadTextRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  uploadText: {
    fontSize: 13,
    color: "#999",
  },

  loadingIndicator: {
    marginLeft: 4,
    justifyContent: "center",
    alignItems: "center",
  },

  uploadImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
    borderRadius: 8,
  },

  overlayEdit: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  editText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
});